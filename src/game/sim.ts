// 防衛戦の進行（固定の時間刻み・seed 付き乱数で決定的）
// 敵は道を進み、守り手は射程の中で最も城門に近い敵を自動で攻撃する。EXP・金貨は進み（Progress）へその場で入る
import { chance, hashSeed, int, type Rng } from './rng';
import { PEDESTALS, pathOf, pointAt } from './field';
import { attackOf, coinOnHit, defDownOf, interval, job, restCoinOf, slowFactor, stopTime } from './jobs';
import { enemy, enemyHp } from './enemies';
import { restExpOf } from './progress';
import { baseScale, stage, stageScale } from './stages';
import type { JobDef, Progress, Warden } from './types';

/** 休憩ゲージが満ちるまでの秒数 */
export const REST_TIME = 16;
/** 1刻み（秒） */
export const STEP = 1 / 30;

export interface SimEnemy {
  uid: number;
  def: string;
  kind: 'normal' | 'fly' | 'metal';
  boss: boolean;
  hp: number;
  maxHp: number;
  lane: number;
  /** 道の上の距離 */
  d: number;
  length: number;
  x: number;
  y: number;
  speed: number;
  slowPerm: number;
  slow: number;
  slowUntil: number;
  stopUntil: number;
  stopImmune: number;
  armorUntil: number;
  defDown: number;
  defUntil: number;
  dead: boolean;
  out: boolean;
}

interface Pending { at: number; wid: string; target: number }

export type SimEvent =
  | { k: 'spawn'; uid: number; boss: boolean }
  | { k: 'shot'; wid: string; target: number; fx: JobDef['fx']; dur: number }
  | { k: 'hit'; uid: number; n: number; metal: boolean; weak: boolean; wid: string }
  | { k: 'status'; uid: number; s: 'slow' | 'stop' | 'armor' | 'knock' | 'def' }
  | { k: 'kill'; uid: number; wid: string; exp: number; coins: number; triple: boolean; x: number; y: number }
  | { k: 'escape'; uid: number; lives: number; x: number; y: number }
  | { k: 'rest'; wid: string; exp: number }
  | { k: 'coin'; wid: string; n: number }
  | { k: 'end'; win: boolean };

export interface Battle {
  stage: number;
  seed: number;
  rng: number;
  t: number;
  phase: 'setup' | 'fight' | 'won' | 'lost';
  scale: number;
  reward: number;
  boss: boolean;
  /** 群れごとの出た数 */
  spawned: number[];
  total: number;
  enemies: SimEnemy[];
  pending: Pending[];
  cool: Record<string, number>;
  /** 錬金術師の金貨の端数 */
  coinFrac: Record<string, number>;
  nextUid: number;
  /** この合戦の村人（毎回満タンから） */
  villagers: number;
  villagersStart: number;
  lost: number;
  kills: number;
  exp: number;
  coins: number;
  restExp: number;
  events: SimEvent[];
}

export function createBattle(p: Progress, stageId: number, seed: number): Battle {
  const s = stage(stageId);
  const scale = stageScale(stageId, p.mode);
  const b: Battle = {
    stage: stageId, seed, rng: hashSeed(seed, 'battle', stageId), t: 0, phase: 'setup', scale, reward: Math.pow(baseScale(stageId), 0.9), boss: s.boss,
    spawned: s.groups.map(() => 0), total: s.groups.reduce((n, gr) => n + gr.count, 0), enemies: [], pending: [], cool: {}, coinFrac: {},
    nextUid: 1, villagers: p.maxVillagers, villagersStart: p.maxVillagers, lost: 0, kills: 0, exp: 0, coins: 0, restExp: 0, events: [],
  };
  // 最初の一撃は少しずらす（全員が同じ瞬間に撃たない）
  for (const w of p.wardens) b.cool[w.id] = 0.2 + (hashSeed(seed, w.id) >>> 0) % 40 / 100;
  return b;
}

export function startFight(b: Battle) {
  if (b.phase === 'setup') b.phase = 'fight';
}

function rngOf(b: Battle): Rng { return { s: b.rng }; }

function spawnEnemy(b: Battle, defId: string, lane: number, hpMul: number) {
  const def = enemy(defId);
  const fly = def.kind === 'fly';
  const path = pathOf(lane, fly);
  const hp = enemyHp(def, b.scale, hpMul);
  const [x, y] = pointAt(path, 0);
  const e: SimEnemy = {
    uid: b.nextUid++, def: defId, kind: def.kind, boss: !!def.boss, hp, maxHp: hp, lane, d: 0, length: path.length, x, y, speed: def.speed,
    slowPerm: 1, slow: 1, slowUntil: 0, stopUntil: 0, stopImmune: 0, armorUntil: 0, defDown: 0, defUntil: 0, dead: false, out: false,
  };
  b.enemies.push(e);
  b.events.push({ k: 'spawn', uid: e.uid, boss: e.boss });
}

function spawnStep(b: Battle) {
  const s = stage(b.stage);
  const r = rngOf(b);
  s.groups.forEach((gr, i) => {
    while (b.spawned[i] < gr.count && b.t >= gr.at + b.spawned[i] * gr.every) {
      const n = b.spawned[i];
      const lane = gr.lane === 'alt' ? n % 3 : gr.lane === 'rand' ? int(r, 3) : gr.lane;
      spawnEnemy(b, gr.enemy, lane, gr.hpMul ?? 1);
      b.spawned[i] += 1;
    }
  });
  b.rng = r.s;
}

function moveStep(b: Battle, p: Progress, dt: number) {
  for (const e of b.enemies) {
    if (e.dead || e.out) continue;
    if (b.t >= e.slowUntil) e.slow = 1;
    if (b.t >= e.defUntil) e.defDown = 0;
    const stopped = b.t < e.stopUntil;
    const v = stopped ? 0 : e.speed * Math.min(e.slow, e.slowPerm);
    e.d += v * dt;
    const [x, y] = pointAt(pathOf(e.lane, e.kind === 'fly'), e.d);
    e.x = x; e.y = y;
    if (e.d >= e.length) {
      e.out = true;
      const lives = enemy(e.def).lives;
      b.villagers = Math.max(0, b.villagers - lives);
      b.lost += lives;
      p.stats.lost += lives;
      b.events.push({ k: 'escape', uid: e.uid, lives, x: e.x, y: e.y });
    }
  }
}

/** 守り手の位置 */
export function wardenPos(w: Warden): [number, number] {
  return PEDESTALS[w.pedestal] ?? PEDESTALS[0];
}

/** その守り手が狙える敵か */
export function canTarget(w: Warden, e: SimEnemy): boolean {
  if (e.dead || e.out) return false;
  const j = job(w.job);
  if (j.flyOnly && e.kind !== 'fly') return false;
  if (e.kind === 'fly' && j.fly <= 0) return false;
  const [x, y] = wardenPos(w);
  if (e.x < -20) return false;
  if (j.front && e.x > x + 30) return false;
  if (j.rangeAll) return true;
  return Math.hypot(e.x - x, e.y - y) <= j.range;
}

/** 打つ敵：射程の中で最も城門に近い敵（止める・薬の職は、まだ効いていない敵を優先） */
export function pickTarget(b: Battle, w: Warden): SimEnemy | null {
  const j = job(w.job);
  let best: SimEnemy | null = null;
  let bestScore = -Infinity;
  for (const e of b.enemies) {
    if (!canTarget(w, e)) continue;
    let score = e.d / e.length;
    if (j.stop && j.atk[0] === 0 && b.t < e.stopUntil) score -= 2;
    if (j.defDown && b.t < e.defUntil) score -= 2;
    if (j.armorBreak && e.kind === 'metal' && b.t >= e.armorUntil) score += 1;
    if (j.slow?.dur === Infinity && e.slowPerm < 1) score -= 0.5;
    if (e.boss) score += 0.05;
    if (score > bestScore) { bestScore = score; best = e; }
  }
  return best;
}

/** 打撃の大きさ */
export function damageOf(b: Battle, w: Warden, e: SimEnemy): { n: number; metal: boolean; weak: boolean } {
  const j = job(w.job);
  let atk = attackOf(j, w.lv, w.limit, w.kills);
  if (atk <= 0) return { n: 0, metal: false, weak: false };
  let weak = false;
  if (e.kind === 'fly') { atk *= j.fly; weak = j.fly < 1; }
  let metal = false;
  if (e.kind === 'metal' && b.t >= e.armorUntil) {
    metal = true;
    atk = j.metal > 0 ? Math.max(1, atk * j.metal) : 1;
  }
  if (e.defDown > 0) atk *= 1 + e.defDown;
  return { n: Math.max(1, Math.floor(atk)), metal, weak };
}

function shotDelay(j: JobDef, dist: number): number {
  switch (j.fx) {
    case 'slash': return 0.1;
    case 'spear': return j.range > 360 ? dist / 1300 : 0.12;
    case 'arrow': return dist / 1500;
    case 'bullet': return dist / 2800;
    case 'cannon': return dist / 1000;
    case 'shuriken': return dist / 1700;
    case 'magic': return 0.14;
    case 'chain': return 0.12;
    case 'potion': return dist / 900;
    case 'dragon': return 0.28;
    default: return 0.1;
  }
}

function attackStep(b: Battle, p: Progress, dt: number) {
  for (const w of p.wardens) {
    const j = job(w.job);
    if (w.resting) {
      // 休憩：ボスのステージでは進まない
      if (!b.boss) {
        w.rest += dt / REST_TIME;
        if (w.rest >= 1) {
          w.rest = 0;
          const n = restExpOf(p, b.stage);
          p.exp += n;
          b.exp += n;
          b.restExp += n;
          p.stats.restExp += n;
          b.events.push({ k: 'rest', wid: w.id, exp: n });
        }
      }
      const rc = restCoinOf(j, w.lv);
      if (rc > 0) {
        b.coinFrac[w.id] = (b.coinFrac[w.id] ?? 0) + rc * dt * Math.max(1, Math.sqrt(b.reward));
        if (b.coinFrac[w.id] >= 1) {
          const n = Math.floor(b.coinFrac[w.id]);
          b.coinFrac[w.id] -= n;
          p.coins += n;
          b.coins += n;
          b.events.push({ k: 'coin', wid: w.id, n });
        }
      }
      continue;
    }
    b.cool[w.id] = (b.cool[w.id] ?? 0) - dt;
    if (b.cool[w.id] > 0) continue;
    const target = pickTarget(b, w);
    if (!target) { b.cool[w.id] = 0; continue; }
    b.cool[w.id] = interval(j);
    const [x, y] = wardenPos(w);
    const delay = shotDelay(j, Math.hypot(target.x - x, target.y - y));
    b.pending.push({ at: b.t + delay, wid: w.id, target: target.uid });
    b.events.push({ k: 'shot', wid: w.id, target: target.uid, fx: j.fx, dur: delay });
  }
}

function landStep(b: Battle, p: Progress) {
  const due = b.pending.filter((h) => h.at <= b.t);
  if (!due.length) return;
  b.pending = b.pending.filter((h) => h.at > b.t);
  for (const h of due) {
    const w = p.wardens.find((x) => x.id === h.wid);
    const e = b.enemies.find((x) => x.uid === h.target);
    if (!w || !e || e.dead || e.out) continue;
    const j = job(w.job);
    const r = rngOf(b);
    // 効果（打撃より先に、倒しても残る物は無いので順は問わない）
    if (j.slow) {
      const f = slowFactor(j, w.lv);
      if (j.slow.dur === Infinity) e.slowPerm = Math.min(e.slowPerm, f);
      else { e.slow = Math.min(e.slow, f); e.slowUntil = Math.max(e.slowUntil, b.t + j.slow.dur); }
      b.events.push({ k: 'status', uid: e.uid, s: 'slow' });
    }
    if (j.stop && b.t >= e.stopImmune) {
      const dur = stopTime(j, w.lv) * (e.boss ? 0.35 : 1);
      e.stopUntil = Math.max(e.stopUntil, b.t + dur);
      e.stopImmune = e.stopUntil + 0.5;
      b.events.push({ k: 'status', uid: e.uid, s: 'stop' });
    }
    if (j.armorBreak && e.kind === 'metal') {
      e.armorUntil = b.t + j.armorBreak;
      b.events.push({ k: 'status', uid: e.uid, s: 'armor' });
    }
    if (j.defDown) {
      e.defDown = Math.max(e.defDown, defDownOf(j, w.lv));
      e.defUntil = b.t + j.defDown.dur;
      b.events.push({ k: 'status', uid: e.uid, s: 'def' });
    }
    if (j.knock) {
      e.d = Math.max(0, e.d - j.knock * (e.boss ? 0.3 : 1) * (0.8 + int(r, 5) / 10));
      b.events.push({ k: 'status', uid: e.uid, s: 'knock' });
    }
    b.rng = r.s;
    const dmg = damageOf(b, w, e);
    if (dmg.n > 0) {
      e.hp -= dmg.n;
      b.events.push({ k: 'hit', uid: e.uid, n: dmg.n, metal: dmg.metal, weak: dmg.weak, wid: w.id });
      const coh = coinOnHit(j, w.lv);
      if (coh > 0) {
        const n = Math.round(coh * Math.max(1, Math.sqrt(b.reward)));
        p.coins += n;
        b.coins += n;
        if (chance(rngOf(b), 0.25)) b.events.push({ k: 'coin', wid: w.id, n });
      }
    }
    if (e.hp <= 0 && !e.dead) {
      e.dead = true;
      const def = enemy(e.def);
      const exp = Math.max(1, Math.round(def.exp * b.reward));
      const triple = !!j.coin3;
      const coins = Math.max(1, Math.round(def.coin * b.reward * (triple ? 3 : 1)));
      p.exp += exp;
      p.coins += coins;
      b.exp += exp;
      b.coins += coins;
      b.kills += 1;
      p.stats.kills += 1;
      if (j.killGrow) w.kills += 1;
      b.events.push({ k: 'kill', uid: e.uid, wid: w.id, exp, coins, triple, x: e.x, y: e.y });
    }
  }
}

/** 1刻み進める */
export function step(b: Battle, p: Progress, dt = STEP) {
  if (b.phase !== 'fight') return;
  b.t += dt;
  spawnStep(b);
  moveStep(b, p, dt);
  attackStep(b, p, dt);
  landStep(b, p);
  // 倒れた・抜けた敵は消す（画面は出来事の位置で演出する）
  b.enemies = b.enemies.filter((e) => !e.dead && !e.out);
  if (b.villagers <= 0) {
    b.phase = 'lost';
    b.events.push({ k: 'end', win: false });
    return;
  }
  const allSpawned = b.spawned.every((n, i) => n >= stage(b.stage).groups[i].count);
  if (allSpawned && b.enemies.every((e) => e.dead || e.out) && !b.pending.length) {
    b.phase = 'won';
    b.events.push({ k: 'end', win: true });
  }
}

/** 何秒ぶん進める（刻みに分ける） */
export function advance(b: Battle, p: Progress, seconds: number) {
  let left = seconds;
  while (left > 1e-9 && b.phase === 'fight') {
    const dt = Math.min(STEP, left);
    step(b, p, dt);
    left -= dt;
  }
}

/** 生きている敵 */
export function liveEnemies(b: Battle): SimEnemy[] {
  return b.enemies.filter((e) => !e.dead && !e.out);
}

/** 残りの敵の数（まだ出ていない分を含む） */
export function remaining(b: Battle): number {
  const left = stage(b.stage).groups.reduce((n, gr, i) => n + gr.count - b.spawned[i], 0);
  return left + liveEnemies(b).length;
}

