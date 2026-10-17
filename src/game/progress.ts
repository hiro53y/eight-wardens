// 育成と進み：共有の EXP・金貨、LvUp・転職・上限突破、休憩の切り替え、配置換え、ステージの結果
import { MAX_LIMIT, job, levelCost, limitCost, maxLv, promoteCost } from './jobs';
import { PEDESTALS } from './field';
import { refreshShop } from './items';
import { STAGE_COUNT, stage, stageScale } from './stages';
import { emptyVillage } from './village';
import type { Mode, Progress, StageDef, Warden } from './types';

export const PROGRESS_VERSION = 3;

/** 8人の守り手（見た目は1枚絵の0〜7） */
const ROSTER: { name: string; sprite: number; job: string; pedestal: number }[] = [
  { name: 'アルト', sprite: 0, job: 'swordsman', pedestal: 3 },
  { name: 'リュカ', sprite: 1, job: 'hunter', pedestal: 2 },
  { name: 'カイ', sprite: 2, job: 'thief', pedestal: 0 },
  { name: 'セナ', sprite: 3, job: 'hunter', pedestal: 5 },
  { name: 'ミナト', sprite: 4, job: 'swordsman', pedestal: 6 },
  { name: 'グレタ', sprite: 5, job: 'hunter', pedestal: 8 },
  { name: 'シノ', sprite: 6, job: 'thief', pedestal: 9 },
  { name: 'イリス', sprite: 7, job: 'swordsman', pedestal: 10 },
];

export function newProgress(mode: Mode, seed: number): Progress {
  const lives = mode === 'pro' ? 8 : 10;
  const p: Progress = {
    v: PROGRESS_VERSION, seed: seed | 0, mode, unlocked: 1, stars: {}, exp: 0, coins: mode === 'pro' ? 80 : 120,
    villagers: lives, maxVillagers: lives, bosses: 0, score: 0,
    wardens: ROSTER.map((r, i): Warden => ({ id: `w${i}`, name: r.name, sprite: r.sprite, job: r.job, lv: 0, limit: 0, pedestal: r.pedestal, resting: false, rest: 0, kills: 0, sp: 0, equip: { weapon: null, charm: null } })),
    stats: { kills: 0, lost: 0, battles: 0, restExp: 0 },
    items: [], nextItemId: 1, shop: [], village: emptyVillage(),
    tower: { best: 0, score: 0, runs: 0, run: null },
    daily: { date: '', cleared: false, best: 0 },
    tips: [],
  };
  refreshShop(p);
  return p;
}

/** v2 の保存を v3 にする（足りない項目を初期値で埋める） */
export function migrate(p: Progress): Progress {
  const q = p as Progress & { v: number };
  if (q.v === 2) {
    q.items = [];
    q.nextItemId = 1;
    q.shop = [];
    q.village = emptyVillage();
    q.tower = { best: 0, score: 0, runs: 0, run: null };
    q.daily = { date: '', cleared: false, best: 0 };
    q.tips = ['lv', 'rest', 'job'];
    for (const w of q.wardens) { w.sp = 0; w.equip = { weapon: null, charm: null }; }
    q.v = PROGRESS_VERSION;
    refreshShop(q);
  }
  return q;
}

// ── 育成 ──

export function levelUpError(p: Progress, w: Warden): string | null {
  const j = job(w.job);
  if (w.lv >= maxLv(j, p.mode)) return j.next.length ? 'Lv3：転職できる' : '最大レベル';
  const c = levelCost(j, w.lv);
  if (p.exp < c.exp) return 'EXP が足りない';
  if (p.coins < c.coins) return '金貨が足りない';
  return null;
}

export function levelUp(p: Progress, w: Warden): boolean {
  if (levelUpError(p, w)) return false;
  const c = levelCost(job(w.job), w.lv);
  p.exp -= c.exp;
  p.coins -= c.coins;
  w.lv += 1;
  return true;
}

export function promoteError(p: Progress, w: Warden, to: string): string | null {
  const j = job(w.job);
  if (!j.next.includes(to)) return 'その職には転職できない';
  if (w.lv < 3) return 'Lv3で転職できる';
  if (p.coins < promoteCost(job(to), p.mode)) return '金貨が足りない';
  return null;
}

export function promote(p: Progress, w: Warden, to: string): boolean {
  if (promoteError(p, w, to)) return false;
  p.coins -= promoteCost(job(to), p.mode);
  w.job = to;
  w.lv = 0;
  w.kills = 0;
  return true;
}

export function limitError(p: Progress, w: Warden): string | null {
  const j = job(w.job);
  if (j.tier < 3 || w.lv < maxLv(j, p.mode)) return '3段目の職を最大レベルにすると突破できる';
  if (w.limit >= MAX_LIMIT) return 'これ以上は突破できない';
  if (p.coins < limitCost(w.limit)) return '金貨が足りない';
  return null;
}

export function limitBreak(p: Progress, w: Warden): boolean {
  if (limitError(p, w)) return false;
  p.coins -= limitCost(w.limit);
  w.limit += 1;
  return true;
}

/** 台座へ動かす（いれば入れ替える） */
export function moveTo(p: Progress, w: Warden, pedestal: number): void {
  if (!Number.isInteger(pedestal) || pedestal < 0 || pedestal >= PEDESTALS.length) return;
  const other = p.wardens.find((x) => x !== w && x.pedestal === pedestal);
  if (other) other.pedestal = w.pedestal;
  w.pedestal = pedestal;
}

export function setRest(w: Warden, on: boolean) {
  w.resting = on;
}

// ── ステージ ──

export function canPlay(p: Progress, id: number): boolean {
  return id >= 1 && id <= Math.min(STAGE_COUNT, p.unlocked);
}

export function restExpOf(p: Progress, id: number): number {
  return restExpOfDef(p, stage(id));
}

export function restExpOfDef(p: Progress, s: StageDef): number {
  return Math.round(s.restExp * (1 + p.bosses * 0.25) * (p.mode === 'pro' ? 0.85 : 1));
}

export interface StageResult {
  win: boolean;
  stage: number;
  kills: number;
  lost: number;
  exp: number;
  coins: number;
  restExp: number;
  stars: number;
  score: number;
  time: number;
  firstClear: boolean;
}

/** 星：村人を失わなければ3、2人までなら2 */
export function starsOf(lost: number): number {
  return lost === 0 ? 3 : lost <= 2 ? 2 : 1;
}

/** 合戦の結果を進みに入れる（勝ちなら次を解放し、村人を少し戻す） */
export function applyResult(p: Progress, r: Omit<StageResult, 'stars' | 'score' | 'firstClear'>): StageResult {
  const firstClear = r.win && !p.stars[r.stage];
  const stars = r.win ? starsOf(r.lost) : 0;
  const score = r.win ? r.kills * 10 + stars * 100 + Math.max(0, p.maxVillagers - r.lost) * 20 + Math.max(0, Math.round(300 - r.time)) : r.kills * 5;
  p.stats.battles += 1;
  if (r.win) {
    p.stars[r.stage] = Math.max(p.stars[r.stage] ?? 0, stars);
    if (r.stage >= p.unlocked) p.unlocked = Math.min(STAGE_COUNT, r.stage + 1);
    const s = stage(r.stage);
    if (s.boss && firstClear) p.bosses += 1;
    if (r.stage === STAGE_COUNT) p.cleared = true;
    p.score += score;
    refreshShop(p);
  }
  return { ...r, stars, score, firstClear };
}

/** 次のステージ（解放済みの最大、すべて済めば最後） */
export function nextStage(p: Progress): number {
  return Math.min(STAGE_COUNT, p.unlocked);
}

export function scaleOf(p: Progress, id: number): number {
  return stageScale(id, p.mode);
}

export function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}
