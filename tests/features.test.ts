// 3.0 の機能の単体テスト：能力の集計・連携・装備と宝箱・村の施設・必殺技・敵の特性・ボスの技・早呼び・会心・連撃・塔・毎日の挑戦・保存の移行
import { describe, expect, it } from 'vitest';
import { enemy } from '../src/game/enemies';
import { PEDESTALS,pathOf } from '../src/game/field';
import { MAX_ITEMS, addItem, autoEquip, buy, buyError, canEquip, equip, makeItem, openChests, refreshShop, sell, sellPrice } from '../src/game/items';
import { job } from '../src/game/jobs';
import { clone, newProgress } from '../src/game/progress';
import { parseProgress } from '../src/game/save';
import { advance, callNext, canTarget, createBattle, nextGroupAt, refreshStats, skillError, startFight, step, useSkill, FEVER_COMBO, SKILL_TIME, type Battle, type SimEnemy } from '../src/game/sim';
import { stage } from '../src/game/stages';
import { wardenStats } from '../src/game/stats';
import { NEIGHBORS, synergyOf } from '../src/game/synergy';
import { DAILY_RULES, chooseBuff, dailyDef, dailyResult, dailyRule, startTower, towerFloor, towerMods, towerResult } from '../src/game/tower';
import type { Progress, Warden } from '../src/game/types';
import { build, buildError, facilityCost, villagersOf } from '../src/game/village';

function put(b: Battle, defId: string, x: number, y: number, o: Partial<SimEnemy> = {}): SimEnemy {
  const def = enemy(defId);
  const fly = def.kind === 'fly';
  const e: SimEnemy = {
    uid: b.nextUid++, def: defId, kind: def.kind, boss: !!def.boss, hp: 1e6, maxHp: 1e6, lane: 1, d: x + 70, length: pathOf(1, fly).length, x, y, speed: 0,
    slowPerm: 1, slow: 1, slowUntil: 0, stopUntil: 0, stopImmune: 0, armorUntil: 0, defDown: 0, defUntil: 0, dead: false, out: false, ...o,
  };
  b.enemies.push(e);
  return e;
}

/** 1人だけ戦わせる（他は休ませる） */
function solo(p: Progress, jobId: string, lv = 0, ped = 4): Warden {
  const w = p.wardens[0];
  const other = p.wardens.find((x) => x !== w && x.pedestal === ped);
  if (other) other.pedestal = w.pedestal;
  w.job = jobId; w.lv = lv; w.pedestal = ped;
  const away=PEDESTALS.map((_,i)=>i).filter(i=>i!==ped&&!NEIGHBORS[ped].includes(i));
  p.wardens.forEach((x,i)=>{if(i){x.resting=true;x.pedestal=away[i-1];}});
  return w;
}

function fight(p: Progress, id = 1, seed = 1): Battle {
  const b = createBattle(p, id, seed);
  b.def = { ...b.def, groups: [] };
  b.spawned = []; b.groupStart = [];
  startFight(b);
  return b;
}

describe('能力の集計と連携', () => {
  it('新しい防衛地点は近隣350px以内の相互接続、最大3本',()=>{
    expect(NEIGHBORS).toHaveLength(12);
    for(let i=0;i<12;i++){expect(NEIGHBORS[i].length).toBeGreaterThan(0);expect(NEIGHBORS[i].length).toBeLessThanOrEqual(3);for(const j of NEIGHBORS[i]){expect(NEIGHBORS[j]).toContain(i);expect(Math.hypot(PEDESTALS[i][0]-PEDESTALS[j][0],PEDESTALS[i][1]-PEDESTALS[j][1])).toBeLessThanOrEqual(350);}}
  });
  it('同系統の攻撃と異系統の射程・速度・会心の連携倍率を維持',()=>{
    const p=newProgress('normal',1),a=p.wardens[0],b=p.wardens[1];
    a.pedestal=0;b.pedestal=NEIGHBORS[0][0];
    const free=PEDESTALS.map((_,i)=>i).filter(i=>i!==a.pedestal&&i!==b.pedestal&&!NEIGHBORS[a.pedestal].includes(i));
    p.wardens.slice(2).forEach((w,i)=>{w.pedestal=free[i];w.job='thief';});
    a.job='swordsman';b.job='swordsman';expect(synergyOf(p,a).atk).toBeCloseTo(.08);
    b.job='hunter';expect(synergyOf(p,b).range).toBeCloseTo(.15);expect(wardenStats(p,b).range).toBeCloseTo(job('hunter').range*1.15);
    b.job='thief';expect(synergyOf(p,a).speed).toBeCloseTo(.1);
    a.job='hunter';expect(synergyOf(p,a).crit).toBeCloseTo(.05);
  });

  it('装備・鍛冶屋・恩恵が攻撃に掛かる', () => {
    const p = newProgress('normal', 1);
    const w = p.wardens[0];
    w.job = 'swordsman'; w.lv = 3; w.pedestal = 9;
    p.wardens.slice(1).forEach((x, i) => { x.pedestal = [0, 1, 2, 3, 4, 5, 7][i]; x.job = 'hunter'; });
    expect(wardenStats(p, w).atk).toBe(100);
    const it = makeItem({ s: 5 }, 1, 10);
    it.kind = 'weapon'; it.line = 'sword'; it.atk = 0.2; it.crit = 0; it.speed = 0; it.range = 0;
    p.items.push(it);
    expect(equip(p, w, it.id)).toBe(true);
    p.village.smith = 2;
    expect(wardenStats(p, w).atk).toBe(Math.round(100 * 1.2 * 1.1));
    expect(wardenStats(p, w, { atkMul: 1.12 }).atk).toBe(Math.round(100 * 1.2 * 1.1 * 1.12));
    // 系統の違う武器は付けられない
    const bow = { ...it, id: 2, line: 'hunt' as const };
    p.items.push(bow);
    expect(canEquip(w, bow)).toBe(false);
    expect(equip(p, w, 2)).toBe(false);
  });
});

describe('装備と宝箱・店', () => {
  it('品質は並・良・極、ステージが進むと強くなる。極は少ない', () => {
    const r = { s: 42 };
    const qs = [0, 0, 0, 0];
    for (let i = 0; i < 2000; i++) qs[makeItem(r, i, 10).q] += 1;
    expect(qs[1]).toBeGreaterThan(qs[2]);
    expect(qs[2]).toBeGreaterThan(qs[3]);
    expect(qs[3]).toBeGreaterThan(0);
    const lo = makeItem({ s: 1 }, 1, 1, 3), hi = makeItem({ s: 1 }, 1, 30, 3);
    expect(hi.price).toBeGreaterThan(lo.price);
    expect(makeItem({ s: 9 }, 1, 5, 2).q).toBeGreaterThanOrEqual(2);
  });

  it('付け替え：他の人が持っていれば外れる。いっぱいなら売られる。売ると金貨', () => {
    const p = newProgress('normal', 1);
    const it = { ...makeItem({ s: 3 }, 1, 5), kind: 'charm' as const };
    p.items.push(it);
    equip(p, p.wardens[0], it.id);
    equip(p, p.wardens[1], it.id);
    expect(p.wardens[0].equip.charm).toBeNull();
    expect(p.wardens[1].equip.charm).toBe(it.id);
    const coins = p.coins;
    expect(sell(p, it.id)).toBe(true);
    expect(p.coins).toBe(coins + sellPrice(it));
    expect(p.wardens[1].equip.charm).toBeNull();
    for (let i = 0; i < MAX_ITEMS; i++) addItem(p, makeItem({ s: i }, 100 + i, 3));
    const c2 = p.coins;
    expect(addItem(p, makeItem({ s: 99 }, 999, 3))).toBe(false);
    expect(p.coins).toBeGreaterThan(c2);
    expect(p.items.length).toBe(MAX_ITEMS);
  });

  it('店は3品。買うと金貨が減り持ち物に入る。宝箱は開けると品が出る', () => {
    const p = newProgress('normal', 1);
    refreshShop(p);
    expect(p.shop.length).toBe(3);
    const it = p.shop[0];
    expect(buyError(p, it.id)).toBe(p.coins < it.price ? '金貨が足りない' : null);
    p.coins = 1e6;
    expect(buy(p, it.id)).toBe(true);
    expect(p.items.map((x) => x.id)).toContain(it.id);
    expect(p.shop.length).toBe(2);
    const got = openChests(p, 3, 10, 7, 2);
    expect(got.length).toBe(3);
    for (const g of got) expect(g.item.q).toBeGreaterThanOrEqual(2);
    autoEquip(p);
    expect(p.wardens.some((w) => w.equip.weapon !== null || w.equip.charm !== null)).toBe(true);
  });
});

describe('村の施設', () => {
  it('金貨で Lv5 まで。値段は上がり、柵で村人が増える', () => {
    const p = newProgress('normal', 1);
    p.coins = 1e7;
    expect(facilityCost('fence', 1)).toBeGreaterThan(facilityCost('fence', 0));
    const v = villagersOf(p);
    for (let i = 0; i < 5; i++) expect(build(p, 'fence')).toBe(true);
    expect(build(p, 'fence')).toBe(false);
    expect(buildError(p, 'fence')).toBe('最大レベル');
    expect(villagersOf(p)).toBe(v + 5);
    expect(createBattle(p, 1, 1).villagers).toBe(v + 5);
  });
});

describe('必殺技', () => {
  it('攻撃するとゲージがたまり、休憩中はたまらない。満タンでないと撃てない', () => {
    const p = newProgress('normal', 1);
    const w = solo(p, 'swordsman', 3);
    const b = fight(p);
    put(b, 'slime', 800, 548);
    expect(skillError(b, w)).toBe('ゲージがたまっていない');
    advance(b, p, SKILL_TIME / 2);
    expect(w.sp).toBeGreaterThan(0.3);
    expect(w.sp).toBeLessThan(0.7);
    const resting = p.wardens[1];
    expect(resting.sp).toBe(0);
  });

  it('回転斬りは周りの敵へ大きな打撃。煙玉は止める。影縫いは弱った敵を倒す。必中はメタルも貫く', () => {
    const p = newProgress('normal', 1);
    const w = solo(p, 'swordsman', 3);
    const b = fight(p);
    const a = put(b, 'slime', 800, 548), far = put(b, 'slime', 100, 460);
    w.sp = 1;
    expect(useSkill(b, p, w)).toBe(true);
    expect(w.sp).toBe(0);
    expect(a.hp).toBe(1e6 - 600);
    expect(far.hp).toBe(1e6);
    // 煙玉
    w.job = 'thief'; refreshStats(b, p); w.sp = 1;
    useSkill(b, p, w);
    expect(a.stopUntil).toBeGreaterThan(b.t + 2);
    // 影縫い
    w.job = 'assassin'; w.lv = 0; refreshStats(b, p); w.sp = 1;
    a.hp = a.maxHp * 0.2;
    useSkill(b, p, w);
    expect(a.dead).toBe(true);
    // 必中
    w.job = 'sniper'; refreshStats(b, p); w.sp = 1;
    b.enemies = [];
    const m = put(b, 'metalSlime', 600, 548, { hp: 5000, maxHp: 5000 });
    useSkill(b, p, w);
    expect(m.hp).toBeLessThan(5000 - 1000);
  });

  it('黄金の雨は金貨と会心の上乗せ。自動で撃つ設定なら満タンで撃つ', () => {
    const p = newProgress('normal', 1);
    const w = solo(p, 'alchemist', 0);
    const b = fight(p);
    put(b, 'slime', 800, 548);
    const coins = p.coins;
    w.sp = 1;
    useSkill(b, p, w);
    expect(p.coins).toBeGreaterThan(coins);
    expect(b.critBuffUntil).toBeGreaterThan(b.t);
    const w2 = solo(p, 'swordsman', 3);
    w2.sp = 1;
    b.autoSkill = true;
    step(b, p);
    expect(w2.sp).toBeLessThan(1);
    expect(b.events.some((e) => e.k === 'skill')).toBe(true);
  });
});

describe('敵の特性', () => {
  it('分裂：倒すと2体に分かれる', () => {
    const p = newProgress('normal', 1);
    const w = solo(p, 'swordsman', 3);
    const b = fight(p);
    put(b, 'splitSlime', 800, 548, { hp: 1, maxHp: 10 });
    advance(b, p, 1.5);
    const minis = b.events.filter((e) => e.k === 'spawn').length;
    expect(minis).toBe(2);
    void w;
  });

  it('盾：打撃が半分。鎧はがしで外れる', () => {
    const p = newProgress('normal', 1);
    solo(p, 'swordsman', 3);
    const b = fight(p);
    const s = put(b, 'shieldGoblin', 800, 548);
    const w = p.wardens[0];
    refreshStats(b, p);
    w.sp = 0;
    advance(b, p, 1);
    const once = 1e6 - s.hp;
    expect(once % 50).toBe(0);
    s.armorUntil = 1e9;
    const before = s.hp;
    advance(b, p, 1);
    expect((before - s.hp) % 100).toBe(0);
  });

  it('回復役は周りを治す。隠密は遠いと狙えず、当てられると見える。降下は地上へ。狂化は速くなる', () => {
    const p = newProgress('normal', 1);
    const w = solo(p, 'hunter', 3, 0);
    w.resting = true;
    const b = fight(p);
    const hurtOne = put(b, 'slime', 400, 548, { hp: 500, maxHp: 1000 });
    put(b, 'shaman', 450, 548, { hp: 100, maxHp: 100 });
    advance(b, p, 2.2);
    expect(hurtOne.hp).toBeGreaterThan(500);
    const shadow = put(b, 'shadowBat', 1300, 300);
    expect(canTarget(w, shadow)).toBe(false);
    shadow.revealed = true;
    w.job = 'sniper';
    expect(canTarget(w, shadow)).toBe(true);
    const dive = put(b, 'diveHawk', 0, 380, { lane: 1, d: 0, speed: 118, length: pathOf(1, true).length });
    advance(b, p, 8);
    expect(dive.landed).toBe(true);
    expect(dive.kind).toBe('normal');
    b.enemies = [];
    const wolf = put(b, 'rageWolf', 500, 548, { hp: 100, maxHp: 1000, speed: 80 });
    w.resting = false; w.job = 'hunter'; refreshStats(b, p);
    advance(b, p, 1.5);
    expect(wolf.raged || wolf.dead).toBe(true);
  });
});

describe('ボスの技', () => {
  it('体力が減ると形態が変わり技を使う。咆哮で近くの味方がすくむ。潜ると狙えない', () => {
    const p = newProgress('normal', 1);
    const w = solo(p, 'swordsman', 3);
    w.resting = true;
    const b = fight(p);
    const boss = put(b, 'scorpion', 700, 548, { boss: true, hp: 1000, maxHp: 1000, speed: 0 });
    b.bossState[boss.uid] = { phase: 0, nextAt: 1e9 };
    boss.hp = 600;
    step(b, p);
    expect(b.events.some((e) => e.k === 'phase')).toBe(true);
    expect(b.events.some((e) => e.k === 'boss')).toBe(true);
    // 咆哮
    b.events = [];
    w.resting = false;
    b.bossState[boss.uid].nextAt = 0;
    let roared = false, burrowed = false;
    for (let i = 0; i < 400 && !(roared && burrowed); i++) {
      b.bossState[boss.uid].nextAt = 0;
      step(b, p);
      for (const e of b.events) if (e.k === 'boss') { if (e.s === 'roar') roared = true; if (e.s === 'burrow') burrowed = true; }
      if (roared) expect(b.stun[w.id]).toBeGreaterThan(0);
      if (boss.hidden) expect(canTarget(w, boss)).toBe(false);
      b.events = [];
      boss.hp = 600;
    }
    expect(roared).toBe(true);
    expect(burrowed).toBe(true);
  });

  it('すべての章のボスに技がある', () => {
    for (const id of [7, 14, 21, 28, 35]) {
      const bossId = stage(id).groups.find((g) => enemy(g.enemy).boss)!.enemy;
      expect(enemy(bossId).bossSkills?.length, bossId).toBeGreaterThan(0);
    }
  });
});

describe('早呼び・会心・連撃', () => {
  it('次の群れが今すぐ始まり、後ろの群れも寄る。縮めた秒数ぶん金貨', () => {
    const p = newProgress('normal', 1);
    const b = createBattle(p, 1, 1);
    startFight(b);
    advance(b, p, 1);
    const at = nextGroupAt(b)!;
    const later = Math.max(...b.groupStart);
    const coins = p.coins;
    const got = callNext(b, p);
    expect(got).toBeGreaterThan(0);
    expect(p.coins).toBe(coins + got);
    expect(Math.max(...b.groupStart)).toBeCloseTo(later - (at - b.t));
    expect(b.events.some((e) => e.k === 'call')).toBe(true);
  });

  it('会心は seed で決まり、打撃は2倍', () => {
    const p = newProgress('normal', 1);
    solo(p, 'swordsman', 3);
    const b = createBattle(p, 1, 1, { mods: { critAdd: 1 } });
    b.def = { ...b.def, groups: [] }; b.spawned = []; b.groupStart = [];
    startFight(b);
    put(b, 'slime', 800, 548);
    advance(b, p, 1.2);
    const hits = b.events.filter((e) => e.k === 'hit');
    expect(hits.length).toBeGreaterThan(0);
    for (const h of hits) if (h.k === 'hit') { expect(h.crit).toBe(true); expect(h.n).toBe(200); }
  });

  it('続けて倒すと連撃。10連撃でフィーバー（金貨が増える）', () => {
    const p = newProgress('normal', 1);
    solo(p, 'swordsman', 3);
    const b = fight(p);
    for (let i = 0; i < FEVER_COMBO; i++) put(b, 'slime', 780 + (i % 3) * 10, 548, { hp: 1, maxHp: 1 });
    p.wardens[0].sp = 1;
    useSkill(b, p, p.wardens[0]);
    expect(b.combo).toBe(FEVER_COMBO);
    expect(b.feverUntil).toBeGreaterThan(b.t);
    expect(b.events.some((e) => e.k === 'fever')).toBe(true);
  });
});

describe('塔と毎日の挑戦', () => {
  it('階が上がると硬くなり、5階ごとにボス。勝つと恩恵を選び、負けると終わる', () => {
    const f1 = towerFloor(1, 'normal'), f10 = towerFloor(10, 'normal'), f40 = towerFloor(40, 'normal');
    expect(f10.hpScale!).toBeGreaterThan(f1.hpScale!);
    expect(f40.hpScale!).toBeGreaterThan(f10.hpScale!);
    expect(towerFloor(5, 'normal').boss).toBe(true);
    expect(towerFloor(4, 'normal').boss).toBe(false);
    const p = newProgress('normal', 1);
    startTower(p);
    const r = towerResult(p, true, 7, 3);
    expect(r.ended).toBe(false);
    expect(p.tower.best).toBe(1);
    expect(p.tower.run!.floor).toBe(2);
    const ch = p.tower.run!.choosing!;
    expect(ch.length).toBe(3);
    expect(chooseBuff(p, ch[0])).toBe(true);
    expect(p.tower.run!.buffs).toEqual([ch[0]]);
    expect(towerMods(['atk', 'atk']).atkMul).toBeCloseTo(1.24);
    expect(towerResult(p, false, 0, 9).ended).toBe(true);
    expect(p.tower.run).toBeNull();
  });

  it('塔の1階は戦える（定義が正しく、終わる）', () => {
    const p = newProgress('normal', 1);
    p.exp = 1e5; p.coins = 1e5;
    const def = towerFloor(1, 'normal');
    const b = createBattle(p, def.id, 3, { def, kind: 'tower' });
    startFight(b);
    b.autoSkill = true;
    advance(b, p, 600);
    expect(['won', 'lost']).toContain(b.phase);
  });

  it('毎日の挑戦は同じ日付なら同じ。今日はじめての勝ちだけ宝箱', () => {
    const p = newProgress('normal', 1);
    p.unlocked = 12;
    const a = dailyDef(p, '2026-10-17'), b2 = dailyDef(p, '2026-10-17');
    expect(JSON.stringify(a)).toBe(JSON.stringify(b2));
    expect(DAILY_RULES[dailyRule('2026-10-17')]).toBeTruthy();
    const rules = new Set<string>();
    for (let d = 1; d <= 28; d++) rules.add(dailyRule(`2026-11-${String(d).padStart(2, '0')}`));
    expect(rules.size).toBeGreaterThanOrEqual(4);
    expect(dailyResult(p, '2026-10-17', true, 500)).toBe(true);
    expect(dailyResult(p, '2026-10-17', true, 600)).toBe(false);
    expect(p.daily.best).toBe(600);
    expect(dailyResult(p, '2026-10-18', true, 100)).toBe(true);
  });
});

describe('保存の移行', () => {
  it('v2 の保存は v3 になって読める。v3 はそのまま読める', () => {
    const p = newProgress('normal', 5);
    const v2 = clone(p) as unknown as Record<string, unknown>;
    v2.v = 2;
    for (const k of ['items', 'nextItemId', 'shop', 'village', 'tower', 'daily', 'tips']) delete v2[k];
    for (const w of v2.wardens as Record<string, unknown>[]) { delete w.sp; delete w.equip; }
    const got = parseProgress(JSON.stringify(v2))!;
    expect(got).not.toBeNull();
    expect(got.v).toBe(3);
    expect(got.items).toEqual([]);
    expect(got.village.fence).toBe(0);
    expect(got.wardens[0].equip).toEqual({ weapon: null, charm: null });
    expect(JSON.stringify(parseProgress(JSON.stringify(p)))).toBe(JSON.stringify(p));
    const bad = clone(p) as unknown as Record<string, unknown>;
    delete bad.items;
    expect(parseProgress(JSON.stringify(bad))).toBeNull();
  });
});
