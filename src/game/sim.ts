// 防衛戦の進行（固定の時間刻み・seed 付き乱数で決定的）
// 敵は道を進み、守り手は射程の中で最も城門に近い敵を自動で攻撃する。EXP・金貨は進み（Progress）へその場で入る
// 3.0：会心・連撃とフィーバー・早呼び・必殺技・敵の特性（分裂・盾・回復・隠密・降下・狂化）・ボスの技
import { chance, hashSeed, int, pick, type Rng } from './rng';
import { LANES, PEDESTALS, pathOf, pointAt } from './field';
import { coinOnHit, defDownOf, job, restCoinOf, slowFactor, stopTime } from './jobs';
import { enemy, enemyHp } from './enemies';
import { restExpOfDef } from './progress';
import { baseScale, stage, stageScale } from './stages';
import { CRIT_MUL, wardenStats, type WStats } from './stats';
import { villageCoin, villagersOf } from './village';
import type { BattleMods, BossSkill, JobDef, Progress, SkillId, StageDef, Warden } from './types';

/** 休憩ゲージが満ちるまでの秒数 */
export const REST_TIME = 16;
/** 1刻み（秒） */
export const STEP = 1 / 30;
/** 必殺技のゲージが満ちるまで、攻撃し続けて何秒か */
export const SKILL_TIME = 20;
/** 連撃が続く間（秒）・フィーバーの長さ・フィーバーになる連撃数 */
export const COMBO_GAP = 1.5;
export const FEVER_TIME = 8;
export const FEVER_COMBO = 10;

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
  /** 隠密が見破られた */
  revealed?: boolean;
  /** 地中・見えない（狙えない） */
  hidden?: boolean;
  burrowUntil?: number;
  chargeUntil?: number;
  raged?: boolean;
  /** 降下した（飛行から地上へ） */
  landed?: boolean;
}

interface Pending { at: number; wid: string; target: number }

export type SimEvent =
  | { k: 'spawn'; uid: number; boss: boolean }
  | { k: 'shot'; wid: string; target: number; fx: JobDef['fx']; dur: number }
  | { k: 'hit'; uid: number; n: number; metal: boolean; weak: boolean; wid: string; crit?: boolean; skill?: boolean }
  | { k: 'status'; uid: number; s: 'slow' | 'stop' | 'armor' | 'knock' | 'def' }
  | { k: 'kill'; uid: number; wid: string; exp: number; coins: number; triple: boolean; x: number; y: number }
  | { k: 'escape'; uid: number; lives: number; x: number; y: number }
  | { k: 'rest'; wid: string; exp: number }
  | { k: 'coin'; wid: string; n: number }
  | { k: 'skill'; wid: string; skill: SkillId; x: number; y: number; r: number }
  | { k: 'boss'; uid: number; s: BossSkill; x: number; y: number }
  | { k: 'phase'; uid: number; phase: number }
  | { k: 'combo'; n: number }
  | { k: 'fever' }
  | { k: 'chest'; x: number; y: number }
  | { k: 'call'; coins: number; sec: number }
  | { k: 'heal'; uid: number; n: number }
  | { k: 'stun'; wid: string }
  | { k: 'land'; uid: number }
  | { k: 'end'; win: boolean };

export interface Battle {
  /** 本編・塔・毎日の挑戦 */
  kind: 'stage' | 'tower' | 'daily';
  stage: number;
  def: StageDef;
  seed: number;
  rng: number;
  t: number;
  phase: 'setup' | 'fight' | 'won' | 'lost';
  scale: number;
  reward: number;
  boss: boolean;
  mods: BattleMods;
  /** 群れごとの始まり（早呼びで前に寄る） */
  groupStart: number[];
  /** 群れごとの出た数 */
  spawned: number[];
  total: number;
  enemies: SimEnemy[];
  pending: Pending[];
  cool: Record<string, number>;
  /** 錬金術師の金貨の端数 */
  coinFrac: Record<string, number>;
  nextUid: number;
  /** この合戦の村人 */
  villagers: number;
  villagersStart: number;
  lost: number;
  kills: number;
  exp: number;
  coins: number;
  restExp: number;
  events: SimEvent[];
  /** 守り手の能力（毎刻み計算し直す） */
  stats: Record<string, WStats>;
  /** 怯み（ボスの咆哮）の終わり */
  stun: Record<string, number>;
  combo: number;
  comboUntil: number;
  bestCombo: number;
  feverUntil: number;
  /** 黄金の雨の会心の上乗せの終わり */
  critBuffUntil: number;
  /** 拾った宝箱 */
  chests: number;
  /** 必殺技を自動で撃つ */
  autoSkill: boolean;
  /** ボスの形態と次の技 */
  bossState: Record<number, { phase: number; nextAt: number }>;
  /** 回復役の次の回復 */
  healAt: Record<number, number>;
}

export interface BattleOpts {
  def?: StageDef;
  kind?: Battle['kind'];
  mods?: BattleMods;
  villagers?: number;
  maxVillagers?: number;
}

export function createBattle(p: Progress, stageId: number, seed: number, o: BattleOpts = {}): Battle {
  const s = o.def ?? stage(stageId);
  const scale = s.hpScale ?? stageScale(stageId, p.mode);
  const reward = s.rewardScale ?? Math.pow(baseScale(stageId), 0.9);
  const maxV = o.maxVillagers ?? villagersOf(p);
  const b: Battle = {
    kind: o.kind ?? 'stage', stage: s.id, def: s, seed, rng: hashSeed(seed, 'battle', s.id), t: 0, phase: 'setup', scale, reward, boss: s.boss, mods: o.mods ?? {},
    groupStart: s.groups.map((gr) => gr.at), spawned: s.groups.map(() => 0), total: s.groups.reduce((n, gr) => n + gr.count, 0),
    enemies: [], pending: [], cool: {}, coinFrac: {}, nextUid: 1,
    villagers: o.villagers ?? maxV, villagersStart: maxV, lost: 0, kills: 0, exp: 0, coins: 0, restExp: 0, events: [],
    stats: {}, stun: {}, combo: 0, comboUntil: 0, bestCombo: 0, feverUntil: 0, critBuffUntil: 0, chests: 0, autoSkill: false, bossState: {}, healAt: {},
  };
  // 最初の一撃は少しずらす（全員が同じ瞬間に撃たない）
  for (const w of p.wardens) b.cool[w.id] = 0.2 + (hashSeed(seed, w.id) >>> 0) % 40 / 100;
  refreshStats(b, p);
  return b;
}

export function startFight(b: Battle) {
  if (b.phase === 'setup') b.phase = 'fight';
}

/** 能力を計算し直す（育成・配置換えの後にも呼ぶ） */
export function refreshStats(b: Battle, p: Progress) {
  for (const w of p.wardens) b.stats[w.id] = wardenStats(p, w, b.mods);
}

export function statsOf(b: Battle, p: Progress, w: Warden): WStats {
  return b.stats[w.id] ?? (b.stats[w.id] = wardenStats(p, w, b.mods));
}

function rngOf(b: Battle): Rng { return { s: b.rng }; }

const fever = (b: Battle) => b.t < b.feverUntil;
const coinMul = (b: Battle, p: Progress) => villageCoin(p) * (b.mods.coinMul ?? 1) * (fever(b) ? 1.5 : 1);

function makeEnemy(b: Battle, defId: string, lane: number, hpMul: number, d = 0, flyOverride?: boolean): SimEnemy {
  const def = enemy(defId);
  const fly = flyOverride ?? def.kind === 'fly';
  const path = pathOf(lane, fly);
  const hp = enemyHp(def, b.scale, hpMul);
  const dd = Math.max(0, Math.min(path.length - 1, d));
  const [x, y] = pointAt(path, dd);
  return {
    uid: b.nextUid++, def: defId, kind: fly ? 'fly' : def.kind === 'fly' ? 'normal' : def.kind, boss: !!def.boss, hp, maxHp: hp, lane, d: dd, length: path.length, x, y, speed: def.speed,
    slowPerm: 1, slow: 1, slowUntil: 0, stopUntil: 0, stopImmune: 0, armorUntil: 0, defDown: 0, defUntil: 0, dead: false, out: false,
  };
}

function spawnEnemy(b: Battle, defId: string, lane: number, hpMul: number, d = 0) {
  const e = makeEnemy(b, defId, lane, hpMul, d);
  b.enemies.push(e);
  b.events.push({ k: 'spawn', uid: e.uid, boss: e.boss });
  if (e.boss) b.bossState[e.uid] = { phase: 0, nextAt: b.t + 7 };
  return e;
}

function spawnStep(b: Battle) {
  const r = rngOf(b);
  b.def.groups.forEach((gr, i) => {
    while (b.spawned[i] < gr.count && b.t >= b.groupStart[i] + b.spawned[i] * gr.every) {
      const n = b.spawned[i];
      const lane = gr.lane === 'alt' ? n % 3 : gr.lane === 'rand' ? int(r, 3) : gr.lane;
      spawnEnemy(b, gr.enemy, lane, gr.hpMul ?? 1);
      b.spawned[i] += 1;
    }
  });
  b.rng = r.s;
}

/** 次に始まる群れ（まだ始まっていない中で最も早い） */
export function nextGroupAt(b: Battle): number | null {
  let best: number | null = null;
  b.groupStart.forEach((at, i) => { if (b.spawned[i] === 0 && at > b.t && (best === null || at < best)) best = at; });
  return best;
}

/** 早呼び：次の群れを今すぐ始め、後ろの群れも同じだけ寄せる。縮めた秒数ぶん金貨 */
export function callNext(b: Battle, p: Progress): number {
  if (b.phase !== 'fight') return 0;
  const at = nextGroupAt(b);
  if (at === null) return 0;
  const sec = at - b.t;
  if (sec < 0.5) return 0;
  b.groupStart = b.groupStart.map((s, i) => (b.spawned[i] === 0 && s >= at ? s - sec : s));
  const coins = Math.max(1, Math.round(sec * 2 * b.reward * coinMul(b, p)));
  p.coins += coins;
  b.coins += coins;
  b.events.push({ k: 'call', coins, sec });
  return coins;
}

/** 降りる：飛行から地上の道へ */
function land(b: Battle, e: SimEnemy) {
  let lane = 0, best = Infinity;
  LANES.forEach((y, i) => { const d = Math.abs(y - e.y); if (d < best) { best = d; lane = i; } });
  const path = pathOf(lane, false);
  e.kind = enemy(e.def).kind === 'metal' ? 'metal' : 'normal';
  e.lane = lane;
  e.d = Math.max(0, Math.min(path.seg[0], e.x + 70));
  e.length = path.length;
  e.landed = true;
  const [x, y] = pointAt(path, e.d);
  e.x = x; e.y = y;
  b.events.push({ k: 'land', uid: e.uid });
}

function moveStep(b: Battle, p: Progress, dt: number) {
  for (const e of b.enemies) {
    if (e.dead || e.out) continue;
    const def = enemy(e.def);
    if (b.t >= e.slowUntil) e.slow = 1;
    if (b.t >= e.defUntil) e.defDown = 0;
    e.hidden = (e.burrowUntil ?? 0) > b.t;
    const stopped = b.t < e.stopUntil;
    const mul = (e.raged ? 1.9 : 1) * ((e.chargeUntil ?? 0) > b.t ? 3.5 : 1) * (b.mods.enemySpeedMul ?? 1);
    const v = stopped ? 0 : e.speed * Math.min(e.slow, e.slowPerm) * mul;
    e.d += v * dt;
    const [x, y] = pointAt(pathOf(e.lane, e.kind === 'fly'), e.d);
    e.x = x; e.y = y;
    if (e.kind === 'fly' && def.dive && !e.landed && e.d >= e.length * def.dive) land(b, e);
    if (e.d >= e.length) {
      e.out = true;
      const lives = def.lives;
      b.villagers = Math.max(0, b.villagers - lives);
      b.lost += lives;
      p.stats.lost += lives;
      b.events.push({ k: 'escape', uid: e.uid, lives, x: e.x, y: e.y });
    }
  }
}

/** 回復役：3秒ごとに周りの敵の傷を治す */
function healStep(b: Battle) {
  for (const e of b.enemies) {
    if (e.dead || e.out || !enemy(e.def).healer || e.x < -20) continue;
    const at = b.healAt[e.uid] ?? (b.healAt[e.uid] = b.t + 2);
    if (b.t < at) continue;
    b.healAt[e.uid] = b.t + 3;
    for (const o of b.enemies) {
      if (o.dead || o.out || o.hp >= o.maxHp) continue;
      if (Math.hypot(o.x - e.x, o.y - e.y) > 230) continue;
      const n = Math.round(o.maxHp * (o.boss ? 0.03 : 0.12));
      o.hp = Math.min(o.maxHp, o.hp + n);
      b.events.push({ k: 'heal', uid: o.uid, n });
    }
  }
}

// ── ボスの技 ──

function castBoss(b: Battle, p: Progress, e: SimEnemy, s: BossSkill) {
  const def = enemy(e.def);
  b.events.push({ k: 'boss', uid: e.uid, s, x: e.x, y: e.y });
  const st = b.bossState[e.uid];
  switch (s) {
    case 'summon': {
      if (!def.summon) break;
      const sd = enemy(def.summon);
      const n = 2 + (st?.phase ?? 0);
      for (let i = 0; i < n; i++) {
        const fly = sd.kind === 'fly';
        const lane = fly ? i % 3 : e.kind === 'fly' ? i % 3 : e.lane;
        const path = pathOf(lane, fly);
        const frac = e.d / e.length;
        const m = makeEnemy(b, def.summon, lane, 0.7, path.length * frac - 30 - i * 25);
        b.enemies.push(m);
        b.events.push({ k: 'spawn', uid: m.uid, boss: false });
      }
      break;
    }
    case 'charge': e.chargeUntil = b.t + 1.6; break;
    case 'roar': {
      for (const w of p.wardens) {
        const [x, y] = wardenPos(w);
        if (Math.hypot(x - e.x, y - e.y) <= 420) { b.stun[w.id] = b.t + 2; b.events.push({ k: 'stun', wid: w.id }); }
      }
      break;
    }
    case 'regen': e.hp = Math.min(e.maxHp, e.hp + e.maxHp * 0.08); b.events.push({ k: 'heal', uid: e.uid, n: Math.round(e.maxHp * 0.08) }); break;
    case 'burrow': e.burrowUntil = b.t + 3; e.hidden = true; break;
    case 'dive': if (e.kind === 'fly' && !e.landed) land(b, e); break;
  }
}

function bossStep(b: Battle, p: Progress) {
  for (const e of b.enemies) {
    if (!e.boss || e.dead || e.out || e.x < 0) continue;
    const def = enemy(e.def);
    const skills = def.bossSkills ?? [];
    if (!skills.length) continue;
    const st = b.bossState[e.uid] ?? (b.bossState[e.uid] = { phase: 0, nextAt: b.t + 7 });
    const ph = e.hp < e.maxHp * 0.33 ? 2 : e.hp < e.maxHp * 0.66 ? 1 : 0;
    const r = rngOf(b);
    if (ph > st.phase) {
      st.phase = ph;
      b.events.push({ k: 'phase', uid: e.uid, phase: ph });
      if (ph === 2 && skills.includes('dive')) castBoss(b, p, e, 'dive');
      else castBoss(b, p, e, pick(r, skills.filter((x) => x !== 'dive')));
      st.nextAt = b.t + 3;
    } else if (b.t >= st.nextAt) {
      const pool = skills.filter((x) => x !== 'dive');
      if (pool.length) castBoss(b, p, e, pick(r, pool));
      st.nextAt = b.t + 9 - st.phase * 2.5;
    }
    b.rng = r.s;
  }
}

/** 守り手の位置 */
export function wardenPos(w: Warden): [number, number] {
  return PEDESTALS[w.pedestal] ?? PEDESTALS[0];
}

/** その守り手が狙える敵か（st を渡すと装備・連携の射程を使う） */
export function canTarget(w: Warden, e: SimEnemy, st?: Pick<WStats, 'range' | 'rangeAll' | 'fly'>): boolean {
  if (e.dead || e.out || e.hidden) return false;
  const j = job(w.job);
  if (j.flyOnly && e.kind !== 'fly') return false;
  const fly = st ? st.fly : j.fly;
  if (e.kind === 'fly' && fly <= 0) return false;
  const [x, y] = wardenPos(w);
  if (e.x < -20) return false;
  if (j.front && e.x > x + 30) return false;
  const range = st ? st.range : j.range;
  const dist = Math.hypot(e.x - x, e.y - y);
  if (enemy(e.def).stealth && !e.revealed && dist > Math.max(160, range * 0.5)) return false;
  if (st ? st.rangeAll : j.rangeAll) return true;
  return dist <= range;
}

/** 打つ敵：射程の中で最も城門に近い敵（止める・薬の職は、まだ効いていない敵を優先） */
export function pickTarget(b: Battle, w: Warden, st?: WStats): SimEnemy | null {
  const j = job(w.job);
  let best: SimEnemy | null = null;
  let bestScore = -Infinity;
  for (const e of b.enemies) {
    if (!canTarget(w, e, st)) continue;
    let score = e.d / e.length;
    if (j.stop && j.atk[0] === 0 && b.t < e.stopUntil) score -= 2;
    if (j.defDown && b.t < e.defUntil) score -= 2;
    if (j.armorBreak && e.kind === 'metal' && b.t >= e.armorUntil) score += 1;
    if (j.armorBreak && enemy(e.def).shield && b.t >= e.armorUntil) score += 0.5;
    if (j.slow?.dur === Infinity && e.slowPerm < 1) score -= 0.5;
    if (enemy(e.def).healer) score += 0.15;
    if (e.boss) score += 0.05;
    if (score > bestScore) { bestScore = score; best = e; }
  }
  return best;
}

/** 打撃の大きさ（mult は技の倍率、pierce はメタルにも通す） */
export function damageOf(b: Battle, p: Progress, w: Warden, e: SimEnemy, mult = 1, pierce = false): { n: number; metal: boolean; weak: boolean } {
  const st = statsOf(b, p, w);
  let atk = st.atk * mult;
  if (atk <= 0) return { n: 0, metal: false, weak: false };
  let weak = false;
  if (e.kind === 'fly') { atk *= st.fly; weak = st.fly < 1; }
  let metal = false;
  if (e.kind === 'metal' && b.t >= e.armorUntil && !pierce) {
    metal = true;
    atk = st.metal > 0 ? Math.max(1, atk * st.metal) : Math.max(1, mult > 1 ? Math.floor(mult) : 1);
  }
  if (enemy(e.def).shield && b.t >= e.armorUntil && e.defDown <= 0) atk *= 0.5;
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
    const st = statsOf(b, p, w);
    if (w.resting) {
      // 休憩：ボスのステージ・休憩禁止の条件では進まない
      if (!b.boss && !b.mods.noRest) {
        w.rest += dt / REST_TIME;
        if (w.rest >= 1) {
          w.rest = 0;
          const n = Math.max(1, Math.round(restExpOfDef(p, b.def) * st.restMul));
          p.exp += n;
          b.exp += n;
          b.restExp += n;
          p.stats.restExp += n;
          b.events.push({ k: 'rest', wid: w.id, exp: n });
        }
      }
      const rc = restCoinOf(j, w.lv);
      if (rc > 0) {
        b.coinFrac[w.id] = (b.coinFrac[w.id] ?? 0) + rc * dt * Math.max(1, Math.sqrt(b.reward)) * coinMul(b, p);
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
    if ((b.stun[w.id] ?? 0) > b.t) continue;
    b.cool[w.id] = (b.cool[w.id] ?? 0) - dt;
    if (b.cool[w.id] > 0) continue;
    const target = pickTarget(b, w, st);
    if (!target) { b.cool[w.id] = 0; continue; }
    b.cool[w.id] = st.interval;
    w.sp = Math.min(1, (w.sp ?? 0) + (st.interval / SKILL_TIME) * st.spMul);
    const [x, y] = wardenPos(w);
    const delay = shotDelay(j, Math.hypot(target.x - x, target.y - y));
    b.pending.push({ at: b.t + delay, wid: w.id, target: target.uid });
    b.events.push({ k: 'shot', wid: w.id, target: target.uid, fx: j.fx, dur: delay });
  }
}

/** 打撃を与える（倒れたら報酬・分裂・宝箱・連撃） */
function hurt(b: Battle, p: Progress, w: Warden | null, e: SimEnemy, dmg: { n: number; metal: boolean; weak: boolean }, o: { crit?: boolean; skill?: boolean } = {}) {
  if (e.dead || e.out) return;
  e.revealed = true;
  if (dmg.n > 0) {
    e.hp -= dmg.n;
    b.events.push({ k: 'hit', uid: e.uid, n: dmg.n, metal: dmg.metal, weak: dmg.weak, wid: w?.id ?? '', crit: o.crit, skill: o.skill });
    if (enemy(e.def).rage && !e.raged && e.hp > 0 && e.hp < e.maxHp / 2) e.raged = true;
  }
  if (e.hp <= 0) killEnemy(b, p, w, e);
}

function killEnemy(b: Battle, p: Progress, w: Warden | null, e: SimEnemy) {
  if (e.dead) return;
  e.dead = true;
  const def = enemy(e.def);
  const j = w ? job(w.job) : null;
  const fv = fever(b);
  const exp = Math.max(1, Math.round(def.exp * b.reward * (fv ? 1.2 : 1)));
  const triple = !!j?.coin3;
  const coins = Math.max(1, Math.round(def.coin * b.reward * (triple ? 3 : 1) * coinMul(b, p)));
  p.exp += exp;
  p.coins += coins;
  b.exp += exp;
  b.coins += coins;
  b.kills += 1;
  p.stats.kills += 1;
  if (w && j?.killGrow) w.kills += 1;
  b.events.push({ k: 'kill', uid: e.uid, wid: w?.id ?? '', exp, coins, triple, x: e.x, y: e.y });
  // 連撃
  b.combo = b.t <= b.comboUntil ? b.combo + 1 : 1;
  b.comboUntil = b.t + COMBO_GAP;
  b.bestCombo = Math.max(b.bestCombo, b.combo);
  if (b.combo >= 3) b.events.push({ k: 'combo', n: b.combo });
  if (b.combo % FEVER_COMBO === 0) { b.feverUntil = b.t + FEVER_TIME; b.events.push({ k: 'fever' }); }
  // 宝箱
  const r = rngOf(b);
  const pChest = def.boss ? 1 : def.kind === 'metal' ? 0.2 : def.elite ? 0.12 : 0.005;
  if (chance(r, pChest)) { b.chests += 1; b.events.push({ k: 'chest', x: e.x, y: e.y }); }
  b.rng = r.s;
  // 分裂
  if (def.split) {
    for (const off of [-18, 18]) {
      const c = makeEnemy(b, def.split, e.lane, def.boss ? 0.5 : 1, e.d + off, e.kind === 'fly');
      b.enemies.push(c);
      b.events.push({ k: 'spawn', uid: c.uid, boss: false });
    }
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
    const st = statsOf(b, p, w);
    const r = rngOf(b);
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
    if (j.armorBreak && (e.kind === 'metal' || enemy(e.def).shield)) {
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
    const crit = st.atk > 0 && chance(r, st.crit + (b.t < b.critBuffUntil ? 0.2 : 0));
    b.rng = r.s;
    const dmg = damageOf(b, p, w, e, crit ? CRIT_MUL : 1);
    if (dmg.n > 0) {
      const coh = coinOnHit(j, w.lv);
      if (coh > 0) {
        const n = Math.round(coh * Math.max(1, Math.sqrt(b.reward)) * coinMul(b, p));
        p.coins += n;
        b.coins += n;
        if (chance(rngOf(b), 0.25)) b.events.push({ k: 'coin', wid: w.id, n });
      }
    }
    hurt(b, p, w, e, dmg, { crit });
  }
}

// ── 必殺技 ──

const live = (b: Battle) => b.enemies.filter((e) => !e.dead && !e.out && !e.hidden && e.x > -20);
const near = (b: Battle, x: number, y: number, r: number) => live(b).filter((e) => Math.hypot(e.x - x, e.y - y) <= r);
const front = (list: SimEnemy[]) => list.reduce<SimEnemy | null>((a, e) => (!a || e.d / e.length > a.d / a.length ? e : a), null);

/** 技の範囲（描画と自動で撃つ判断に使う） */
export const SKILL_RADIUS: Partial<Record<SkillId, number>> = { whirl: 290, smoke: 330, plunder: 330, darkwave: 460 };

export function skillError(b: Battle, w: Warden): string | null {
  if (b.phase !== 'fight') return '戦闘中だけ';
  if ((w.sp ?? 0) < 1) return 'ゲージがたまっていない';
  if (w.resting) return '休憩中';
  if ((b.stun[w.id] ?? 0) > b.t) return 'すくんでいる';
  if (!live(b).length) return '敵がいない';
  return null;
}

/** 技が当たる敵がいるか（自動で撃つ判断） */
function skillUseful(b: Battle, w: Warden): boolean {
  const s = job(w.job).skill;
  const [x, y] = wardenPos(w);
  const r = SKILL_RADIUS[s];
  if (r) return near(b, x, y - 20, r).length >= (s === 'darkwave' ? 2 : 1);
  if (s === 'dragonfall') return live(b).some((e) => e.kind === 'fly');
  return live(b).length >= 2 || b.enemies.some((e) => e.boss);
}

export function useSkill(b: Battle, p: Progress, w: Warden): boolean {
  if (skillError(b, w)) return false;
  w.sp = 0;
  const j = job(w.job);
  const s = j.skill;
  const [wx, wy] = wardenPos(w);
  const cm = coinMul(b, p);
  let cx = wx, cy = wy - 20, rad = SKILL_RADIUS[s] ?? 0;
  const hit = (e: SimEnemy, mult: number, pierce = false) => hurt(b, p, w, e, damageOf(b, p, w, e, mult, pierce), { skill: true });
  const all = live(b);
  switch (s) {
    case 'whirl': for (const e of near(b, cx, cy, rad)) hit(e, 6); break;
    case 'issen': {
      const f = front(all.filter((e) => e.kind !== 'fly')) ?? front(all);
      if (!f) break;
      cx = f.x; cy = f.y; rad = 0;
      for (const e of all) if (e === f || (e.kind !== 'fly' && f.kind !== 'fly' && e.lane === f.lane)) hit(e, 9, true);
      break;
    }
    case 'seal': {
      const f = front(all);
      if (!f) break;
      cx = f.x; cy = f.y; rad = 300;
      for (const e of near(b, cx, cy, rad)) { e.slowPerm = Math.min(e.slowPerm, 0.45); hit(e, 3); }
      break;
    }
    case 'darkwave': for (const e of near(b, cx, cy, rad)) { e.defDown = Math.max(e.defDown, 0.35); e.defUntil = b.t + 6; hit(e, 4); } break;
    case 'dragonfall': {
      const flyers = all.filter((e) => e.kind === 'fly');
      if (flyers.length) for (const e of flyers) hit(e, 8);
      else { const f = front(all); if (f) { cx = f.x; cy = f.y; hit(f, 6); } }
      rad = 0;
      break;
    }
    case 'arrowRain': {
      // 敵がいちばん多い所
      let c = all[0], bestN = -1;
      for (const e of all) { const n = all.filter((o) => Math.hypot(o.x - e.x, o.y - e.y) <= 200).length; if (n > bestN) { bestN = n; c = e; } }
      if (!c) break;
      cx = c.x; cy = c.y; rad = 210;
      const targets = near(b, cx, cy, rad);
      for (let i = 0; i < 4; i++) for (const e of targets) hit(e, 2);
      break;
    }
    case 'snipe': {
      const t = all.reduce<SimEnemy | null>((a, e) => (!a || e.hp > a.hp ? e : a), null);
      if (!t) break;
      cx = t.x; cy = t.y; rad = 0;
      hit(t, 15, true);
      break;
    }
    case 'bigCannon': {
      const f = front(all);
      if (!f) break;
      cx = f.x; cy = f.y; rad = 240;
      for (const e of near(b, cx, cy, rad)) { e.d = Math.max(0, e.d - 240 * (e.boss ? 0.3 : 1)); hit(e, 6); }
      break;
    }
    case 'armorCrush': {
      rad = 520;
      for (const e of near(b, cx, cy, rad)) {
        e.armorUntil = Math.max(e.armorUntil, b.t + 6);
        e.defDown = Math.max(e.defDown, 0.5); e.defUntil = b.t + 6;
        hit(e, 3);
      }
      break;
    }
    case 'smoke': for (const e of near(b, cx, cy, rad)) { e.stopUntil = Math.max(e.stopUntil, b.t + (e.boss ? 1 : 3)); e.stopImmune = e.stopUntil + 0.5; } break;
    case 'shadow': {
      rad = 700;
      let any = false;
      for (const e of near(b, cx, cy, rad)) {
        if (!e.boss && e.hp <= e.maxHp * 0.3) { any = true; hurt(b, p, w, e, { n: Math.ceil(e.hp), metal: false, weak: false }, { skill: true }); }
        else if (e.boss) { any = true; hit(e, 8); }
      }
      if (!any) { const f = front(all); if (f) hit(f, 8); }
      break;
    }
    case 'plunder': {
      for (const e of near(b, cx, cy, rad)) {
        hit(e, 4);
        const n = Math.max(1, Math.round(6 * b.reward * cm));
        p.coins += n; b.coins += n;
      }
      break;
    }
    case 'net': {
      rad = 9999;
      for (const e of all) {
        e.slow = Math.min(e.slow, 0.5); e.slowUntil = Math.max(e.slowUntil, b.t + 6);
        if (!e.boss) { e.stopUntil = Math.max(e.stopUntil, b.t + 0.8); }
      }
      break;
    }
    case 'goldRain': {
      const n = Math.max(1, Math.round(40 * b.reward * (1 + w.lv * 0.5) * cm));
      p.coins += n; b.coins += n;
      b.critBuffUntil = b.t + 8;
      b.events.push({ k: 'coin', wid: w.id, n });
      rad = 9999;
      break;
    }
  }
  b.events.push({ k: 'skill', wid: w.id, skill: s, x: cx, y: cy, r: rad });
  return true;
}

function autoSkillStep(b: Battle, p: Progress) {
  if (!b.autoSkill) return;
  for (const w of p.wardens) {
    if ((w.sp ?? 0) >= 1 && !skillError(b, w) && skillUseful(b, w)) useSkill(b, p, w);
  }
}

/** 1刻み進める */
export function step(b: Battle, p: Progress, dt = STEP) {
  if (b.phase !== 'fight') return;
  b.t += dt;
  refreshStats(b, p);
  spawnStep(b);
  moveStep(b, p, dt);
  healStep(b);
  bossStep(b, p);
  attackStep(b, p, dt);
  landStep(b, p);
  autoSkillStep(b, p);
  // 倒れた・抜けた敵は消す（画面は出来事の位置で演出する）
  b.enemies = b.enemies.filter((e) => !e.dead && !e.out);
  if (b.villagers <= 0) {
    b.phase = 'lost';
    b.events.push({ k: 'end', win: false });
    return;
  }
  const allSpawned = b.spawned.every((n, i) => n >= b.def.groups[i].count);
  if (allSpawned && b.enemies.length === 0 && !b.pending.length) {
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
  const left = b.def.groups.reduce((n, gr, i) => n + gr.count - b.spawned[i], 0);
  return left + liveEnemies(b).length;
}
