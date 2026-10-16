// ゲームの決まりの単体テスト：職業表・育成・休憩・敵の型と状態・狙い・保存・総当たり
import { describe, expect, it } from 'vitest';
import { JOBS, attackOf, interval, job, levelCost, maxLv, promoteCost, limitCost, MAX_LIMIT } from '../src/game/jobs';
import { ENEMIES, enemy, enemyHp } from '../src/game/enemies';
import { GATE, PEDESTALS, pathOf, pointAt } from '../src/game/field';
import { STAGES, STAGE_COUNT, stage } from '../src/game/stages';
import { applyResult, clone, levelUp, levelUpError, limitBreak, moveTo, newProgress, promote, promoteError, restExpOf, setRest, starsOf } from '../src/game/progress';
import { REST_TIME, advance, callNext, canTarget, createBattle, damageOf, pickTarget, refreshStats, startFight, step, useSkill, type Battle, type SimEnemy } from '../src/game/sim';
import { build } from '../src/game/village';
import { autoEquip, openChests } from '../src/game/items';
import { parseProgress, loadSettings, saveSettings, type KV } from '../src/game/save';
import type { Progress, Warden } from '../src/game/types';
import { playRun, playStage } from './bot';

function memKV(): KV {
  const m = new Map<string, string>();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v), removeItem: (k) => void m.delete(k) };
}

/** 敵を1体、決まった場所に置く（地上は真ん中の道の上。d は道の始めからの距離） */
function put(b: Battle, defId: string, x: number, y: number, o: Partial<SimEnemy> = {}): SimEnemy {
  const def = enemy(defId);
  const e: SimEnemy = {
    uid: b.nextUid++, def: defId, kind: def.kind, boss: !!def.boss, hp: 1e6, maxHp: 1e6, lane: 1, d: x + 70, length: pathOf(1, false).length, x, y, speed: 0,
    slowPerm: 1, slow: 1, slowUntil: 0, stopUntil: 0, stopImmune: 0, armorUntil: 0, defDown: 0, defUntil: 0, dead: false, out: false, ...o,
  };
  b.enemies.push(e);
  return e;
}

/** 能力を計算し直してから打撃を出す（職を差し替えたテスト用） */
function dmg(b: Battle, p: Progress, w: Warden, e: SimEnemy) {
  refreshStats(b, p);
  return damageOf(b, p, w, e);
}

function onlyOne(p: Progress, jobId: string, lv = 0): Warden {
  const w = p.wardens[0];
  w.job = jobId; w.lv = lv; w.pedestal = 4;
  // 他は隣にいない台座へ（連携が効かないように）
  const away = [0, 2, 6, 8, 9, 10, 11];
  p.wardens.forEach((x, i) => { if (i) { x.resting = true; x.pedestal = away[i - 1]; } });
  return w;
}

describe('職業表', () => {
  it('21職。1段・2段は Lv0〜3、3段は Lv0〜10。転職先は1つ下の段で2択', () => {
    expect(Object.keys(JOBS).length).toBe(21);
    for (const j of Object.values(JOBS)) {
      expect(j.atk.length, j.id).toBe(j.tier === 3 ? 11 : 4);
      if (j.tier < 3) {
        expect(j.next.length, j.id).toBe(2);
        for (const n of j.next) expect(job(n).tier).toBe(j.tier + 1);
      } else expect(j.next).toEqual([]);
      expect(interval(j)).toBeGreaterThan(0);
      for (let i = 1; i < j.atk.length; i++) expect(j.atk[i]).toBeGreaterThanOrEqual(j.atk[i - 1]);
    }
    expect(maxLv(job('samurai'), 'normal')).toBe(5);
    expect(maxLv(job('samurai'), 'pro')).toBe(10);
    expect(attackOf(job('swordsman'), 3)).toBe(100);
    expect(attackOf(job('samurai'), 0, 2)).toBe(1440);
  });

  it('速さの等級：暗殺者（SSS）がいちばん速く、竜騎士（F）が遅い', () => {
    expect(interval(job('assassin'))).toBeLessThan(interval(job('ninja')));
    expect(interval(job('dragonKnight'))).toBeGreaterThan(interval(job('sniper')));
  });
});

describe('育成（共有の EXP・金貨）', () => {
  it('EXP を払ってレベルを上げ、Lv3で金貨を払って2択の転職、3段目は最大のあと上限突破', () => {
    const p = newProgress('normal', 1);
    const w = p.wardens[0];
    expect(levelUpError(p, w)).toBe('EXP が足りない');
    p.exp = 10000;
    for (let i = 0; i < 3; i++) expect(levelUp(p, w)).toBe(true);
    expect(w.lv).toBe(3);
    expect(p.exp).toBe(10000 - 20 - 60 - 150);
    expect(levelUp(p, w)).toBe(false);
    p.coins = 0;
    expect(promoteError(p, w, 'warrior')).toBe('金貨が足りない');
    p.coins = 99999;
    expect(promoteError(p, w, 'samurai')).toBe('その職には転職できない');
    expect(promote(p, w, 'warrior')).toBe(true);
    expect(w.job).toBe('warrior');
    expect(w.lv).toBe(0);
    expect(p.coins).toBe(99999 - promoteCost(job('warrior'), 'normal'));
    w.job = 'samurai'; w.lv = 5;
    p.coins = 1e9;
    for (let i = 0; i < MAX_LIMIT; i++) expect(limitBreak(p, w)).toBe(true);
    expect(limitBreak(p, w)).toBe(false);
    expect(limitCost(0)).toBe(5000);
  });

  it('盗の3段目（暗殺者・海賊）はレベルを金貨で上げる', () => {
    expect(levelCost(job('assassin'), 0)).toEqual({ exp: 0, coins: 1800 });
    expect(levelCost(job('samurai'), 0).exp).toBe(3000);
  });

  it('配置換え：台座が空いていれば動き、いれば入れ替える', () => {
    const p = newProgress('normal', 1);
    const [a, b] = p.wardens;
    const pa = a.pedestal, pb = b.pedestal;
    moveTo(p, a, pb);
    expect(a.pedestal).toBe(pb);
    expect(b.pedestal).toBe(pa);
    const free = [...Array(12).keys()].find((i) => !p.wardens.some((w) => w.pedestal === i))!;
    moveTo(p, a, free);
    expect(a.pedestal).toBe(free);
    expect(new Set(p.wardens.map((w) => w.pedestal)).size).toBe(8);
  });
});

describe('休憩', () => {
  it('休憩中は攻撃せず、ゲージが満ちると EXP が入る。ボスのステージでは進まない', () => {
    const p = newProgress('normal', 1);
    for (const w of p.wardens) setRest(w, true);
    const b = createBattle(p, 2, 1);
    startFight(b);
    const exp0 = p.exp;
    advance(b, p, REST_TIME + 0.2);
    expect(p.exp - exp0).toBeGreaterThanOrEqual(restExpOf(p, 2) * 8);
    expect(b.events.some((e) => e.k === 'shot')).toBe(false);
    const q = newProgress('normal', 1);
    for (const w of q.wardens) setRest(w, true);
    const boss = createBattle(q, 7, 1);
    startFight(boss);
    advance(boss, q, REST_TIME + 1);
    expect(q.exp).toBe(0);
    expect(q.wardens[0].rest).toBe(0);
  });

  it('ボスを越えるたびに休憩の EXP が増える', () => {
    const p = newProgress('normal', 1);
    const a = restExpOf(p, 10);
    p.bosses = 2;
    expect(restExpOf(p, 10)).toBe(Math.round(a * 1.5));
  });
});

describe('敵と戦場', () => {
  it('地上は道を進んで城門へ、飛行は道を無視して城門へまっすぐ', () => {
    for (let lane = 0; lane < 3; lane++) {
      const g = pathOf(lane, false), f = pathOf(lane, true);
      const end = pointAt(g, g.length);
      expect(Math.hypot(end[0] - GATE[0], end[1] - GATE[1])).toBeLessThan(20);
      expect(f.pts.length).toBe(2);
      const fe = pointAt(f, f.length);
      expect(Math.hypot(fe[0] - GATE[0], fe[1] - GATE[1])).toBeLessThan(40);
    }
    expect(PEDESTALS.length).toBe(12);
  });

  it('メタルはふつう1しか通らず、武士・侍は割合で通り、鎧が剥がれると全員の攻撃が通る', () => {
    const p = newProgress('normal', 1);
    const w = onlyOne(p, 'swordsman', 3);
    const b = createBattle(p, 1, 1);
    const e = put(b, 'metalSlime', 790, 548);
    expect(dmg(b, p, w, e).n).toBe(1);
    w.job = 'samurai'; w.lv = 0;
    expect(dmg(b, p, w, e).n).toBe(Math.floor(1200 * 0.6));
    w.job = 'swordsman'; w.lv = 3;
    e.armorUntil = 10;
    expect(dmg(b, p, w, e).n).toBe(100);
  });

  it('飛行：剣は半分、狩人は2倍。竜騎士は飛行だけをどこでも狙い、地上は狙えない', () => {
    const p = newProgress('normal', 1);
    const w = onlyOne(p, 'swordsman', 3);
    const b = createBattle(p, 1, 1);
    const bat = put(b, 'bat', 800, 470);
    expect(dmg(b, p, w, bat).n).toBe(50);
    w.job = 'hunter';
    expect(dmg(b, p, w, bat).n).toBe(160);
    w.job = 'dragonKnight'; w.lv = 0;
    const far = put(b, 'bat', 100, 300);
    const ground = put(b, 'slime', 800, 548);
    expect(canTarget(w, far)).toBe(true);
    expect(canTarget(w, ground)).toBe(false);
  });

  it('狙い：射程の中で最も城門に近い敵。銃士は前方だけ', () => {
    const p = newProgress('normal', 1);
    const w = onlyOne(p, 'hunter', 0);
    const b = createBattle(p, 1, 1);
    const behind = put(b, 'slime', 600, 548);
    const ahead = put(b, 'slime', 900, 548);
    expect(pickTarget(b, w)?.uid).toBe(ahead.uid);
    w.job = 'gunner';
    // 銃士は、まだ自分を通り過ぎていない敵だけ
    expect(canTarget(w, behind)).toBe(true);
    expect(canTarget(w, ahead)).toBe(false);
  });

  it('鈍化・停止・押し戻し・守り下げが効き、ボスへの停止は短い', () => {
    const p = newProgress('normal', 1);
    const w = onlyOne(p, 'trapper', 0);
    w.pedestal = 4;
    const b = createBattle(p, 1, 1);
    startFight(b);
    const e = put(b, 'slime', 790, 548, { speed: 50 });
    for (let i = 0; i < 120 && e.stopUntil === 0; i++) step(b, p);
    expect(e.stopUntil).toBeGreaterThan(b.t);
    e.dead = true;
    const boss = put(b, 'kingSlime', 790, 548, { speed: 0, boss: true });
    for (let i = 0; i < 200 && boss.stopUntil === 0; i++) step(b, p);
    expect(boss.stopUntil - b.t).toBeLessThan(2.2 * 0.36);
    boss.dead = true;
    w.job = 'cannoneer'; w.lv = 0;
    const k = put(b, 'slime', 790, 548, { speed: 0 });
    const d0 = k.d;
    for (let i = 0; i < 200 && k.d >= d0; i++) step(b, p);
    expect(k.d).toBeLessThan(d0);
    k.dead = true;
    w.job = 'magicSword';
    const s = put(b, 'slime', 790, 548, { speed: 0 });
    for (let i = 0; i < 200 && s.slowPerm === 1; i++) step(b, p);
    expect(s.slowPerm).toBeLessThan(1);
  });

  it('止めを刺すと盗賊は金貨3倍', () => {
    const p = newProgress('normal', 1);
    const w = onlyOne(p, 'thief', 3);
    const b = createBattle(p, 1, 1);
    startFight(b);
    put(b, 'slime', 790, 548, { hp: 1, maxHp: 1 });
    for (let i = 0; i < 100 && !b.events.some((e) => e.k === 'kill'); i++) step(b, p);
    const kill = b.events.find((e) => e.k === 'kill');
    expect(kill && kill.k === 'kill' && kill.triple).toBe(true);
    expect(kill && kill.k === 'kill' && kill.coins).toBe(Math.max(1, Math.round(enemy('slime').coin * b.reward * 3)));
    void w;
  });

  it('城門に着くと村人が減り、0で負け', () => {
    const p = newProgress('normal', 1);
    for (const w of p.wardens) setRest(w, true);
    const b = createBattle(p, 1, 1);
    startFight(b);
    advance(b, p, 400);
    expect(b.phase).toBe('lost');
    expect(b.villagers).toBe(0);
    expect(b.lost).toBeGreaterThanOrEqual(p.maxVillagers);
  });
});

describe('ステージと結果', () => {
  it('35ステージ、7ごとにボス。敵はすべて定義済み', () => {
    expect(STAGES.length).toBe(STAGE_COUNT);
    for (const s of STAGES) {
      expect(s.boss).toBe(s.id % 7 === 0);
      for (const g of s.groups) expect(ENEMIES[g.enemy], `${s.id} ${g.enemy}`).toBeTruthy();
      if (s.boss) expect(s.groups.some((g) => enemy(g.enemy).boss)).toBe(true);
    }
    expect(enemyHp(enemy('metalSlime'), 100)).toBeLessThan(enemyHp(enemy('slime'), 100));
  });

  it('勝つと次が開き、星は失った村人で決まる。ボスを初めて越えると数える', () => {
    const p = newProgress('normal', 1);
    const r = applyResult(p, { win: true, stage: 1, kills: 20, lost: 1, exp: 0, coins: 0, restExp: 0, time: 60 });
    expect(r.stars).toBe(2);
    expect(p.unlocked).toBe(2);
    expect(starsOf(0)).toBe(3);
    expect(starsOf(5)).toBe(1);
    p.unlocked = 7;
    applyResult(p, { win: true, stage: 7, kills: 20, lost: 0, exp: 0, coins: 0, restExp: 0, time: 60 });
    applyResult(p, { win: true, stage: 7, kills: 20, lost: 0, exp: 0, coins: 0, restExp: 0, time: 60 });
    expect(p.bosses).toBe(1);
  });

  it('最初のステージは育てなくても上手に守れば勝てる', () => {
    const p = newProgress('normal', 3);
    const r = playStage(p, 1, 5);
    expect(r.win).toBe(true);
  });
});

describe('保存', () => {
  it('書いて読むと同じ。壊れた・古いデータは読まない。設定の速さは1〜3', () => {
    const p = newProgress('pro', 9);
    const text = JSON.stringify(p);
    expect(JSON.stringify(parseProgress(text))).toBe(text);
    expect(parseProgress('{')).toBeNull();
    expect(parseProgress(JSON.stringify({ ...p, v: 1 }))).toBeNull();
    const bad = clone(p); bad.wardens[1].pedestal = bad.wardens[0].pedestal;
    expect(parseProgress(JSON.stringify(bad))).toBeNull();
    const kv = memKV();
    kv.setItem('eight-wardens-v2:settings', JSON.stringify({ speed: 9 }));
    expect(loadSettings(kv).speed).toBe(1);
    saveSettings({ bgm: 0.1, se: 0.2, speed: 3, numbers: false, autoSkill: true }, kv);
    expect(loadSettings(kv)).toEqual({ bgm: 0.1, se: 0.2, speed: 3, numbers: false, autoSkill: true });
  });
});

describe('総当たりと再現', () => {
  it('でたらめな操作（配置・LvUp・転職・休憩・技・早呼び・施設・装備）を混ぜても、数が壊れず必ず終わる', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const p = newProgress(seed % 2 ? 'normal' : 'pro', seed);
      p.exp = 1e6; p.coins = 1e6;
      const id = 1 + (seed * 7) % STAGE_COUNT;
      const b = createBattle(p, id, seed);
      startFight(b);
      let s = seed;
      const rnd = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
      for (let i = 0; i < 4000 && b.phase === 'fight'; i++) {
        if (i % 20 === 0) {
          const w = p.wardens[Math.floor(rnd() * 8)];
          const r = rnd();
          if (r < 0.25) levelUp(p, w);
          else if (r < 0.4) { const j = job(w.job); if (j.next.length) promote(p, w, j.next[Math.floor(rnd() * 2)]); }
          else if (r < 0.6) setRest(w, !w.resting);
          else if (r < 0.7) moveTo(p, w, Math.floor(rnd() * 12));
          else if (r < 0.78) { w.sp = 1; useSkill(b, p, w); }
          else if (r < 0.84) callNext(b, p);
          else if (r < 0.9) { build(p, (['fence', 'training', 'smith', 'market', 'watch'] as const)[Math.floor(rnd() * 5)]); openChests(p, 1, id, seed); autoEquip(p); }
          else limitBreak(p, w);
        }
        step(b, p);
        for (const e of b.enemies) {
          expect(Number.isFinite(e.x) && Number.isFinite(e.y) && Number.isFinite(e.hp)).toBe(true);
          expect(e.d).toBeGreaterThanOrEqual(0);
        }
        expect(p.exp).toBeGreaterThanOrEqual(0);
        expect(p.coins).toBeGreaterThanOrEqual(0);
        expect(b.villagers).toBeGreaterThanOrEqual(0);
        expect(new Set(p.wardens.map((w) => w.pedestal)).size).toBe(8);
      }
      // 終わらない時は休みすぎ。全員出して最後まで
      for (const w of p.wardens) setRest(w, false);
      advance(b, p, 2000);
      expect(b.phase === 'won' || b.phase === 'lost', `stage ${id}`).toBe(true);
    }
  });

  it('同じ seed と同じ操作なら同じ結果', () => {
    const run = () => { const p = newProgress('normal', 4); const r = playStage(p, 3, 77); return JSON.stringify({ r, p }); };
    expect(run()).toBe(run());
  });

  it('上手なボットは、ふつうで35ステージを最後まで通せる', () => {
    const r = playRun('normal', 100, 120);
    expect(r.cleared).toBe(true);
    expect(stage(35).boss).toBe(true);
  }, 300000);
});
