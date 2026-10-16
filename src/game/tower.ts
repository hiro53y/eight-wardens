// 無限の塔と毎日の挑戦：短い防衛を階ごとに重ね、階を越えるたびに恩恵を1つ選ぶ。毎日の挑戦は日付で決まる条件付きのステージ
import { hashSeed, int, pick, shuffle, type Rng } from './rng';
import { CHAPTERS, PER_CHAPTER, STAGE_COUNT, baseScale, groupsFor, smoothCalib } from './stages';
import { villagersOf } from './village';
import type { BattleMods, BuffId, Group, Mode, Progress, StageDef } from './types';

/** 塔を開くには、このステージを越える */
export const TOWER_UNLOCK = 7;
export const TOWER_ID = 1000;
export const DAILY_ID = 2000;

export function towerOpen(p: Progress): boolean {
  return p.unlocked > TOWER_UNLOCK || !!p.stars[TOWER_UNLOCK];
}

/** 階の強さ（本編のステージ相当。34階より上はさらに伸びる） */
function floorSid(f: number): number {
  return Math.min(STAGE_COUNT, 2 + f);
}

/** unlocked は本編の進み。報酬は本編で届いている所までに抑える（塔で稼ぎすぎて本編が簡単にならないように） */
export function towerFloor(f: number, mode: Mode, unlocked = STAGE_COUNT): StageDef {
  const sid = floorSid(f);
  const rid = Math.min(sid, Math.max(3, unlocked));
  const over = Math.max(0, f - (STAGE_COUNT - 2));
  const c = ((Math.ceil(f / 5) - 1) % CHAPTERS.length) + 1;
  const boss = f % 5 === 0;
  const k = boss ? PER_CHAPTER : ((f - 1) % 5) + 1 + (f % 7 === 6 ? 1 : 0);
  const ch = Math.min(CHAPTERS.length, Math.max(1, Math.ceil(sid / PER_CHAPTER)));
  const raw = groupsFor(CHAPTERS[(c - 1)].pool, ch, Math.min(PER_CHAPTER, k));
  // 短く：数を減らし、間を詰める
  const groups: Group[] = raw.map((gr) => ({ ...gr, count: gr.enemy === CHAPTERS[c - 1].pool.boss ? 1 : Math.max(1, Math.round(gr.count * 0.6)), at: gr.at * 0.7 }));
  const proMul = mode === 'pro' ? 1.25 : 1;
  return {
    id: TOWER_ID + f, chapter: c, name: `塔 ${f}階${boss ? '（ボス）' : ''}`, boss, groups, scale: 1,
    restExp: Math.round(14 * Math.pow(baseScale(rid), 0.9) * 0.5),
    hpScale: baseScale(sid) * smoothCalib(sid) * 0.85 * Math.pow(1.13, over) * proMul,
    rewardScale: Math.pow(baseScale(rid), 0.9) * 0.5,
    tier: Math.min(sid + over, rid + 2),
  };
}

// ── 恩恵 ──

export const BUFFS: Record<BuffId, { name: string; desc: string }> = {
  atk: { name: '剛力', desc: '全員の攻撃 +12%' },
  crit: { name: '鷹の目', desc: '会心 +6%' },
  lives: { name: '援軍', desc: '村人 +2（上限も）' },
  sp: { name: '闘志', desc: '技ゲージのたまり +25%' },
  coin: { name: '商才', desc: '金貨 +25%' },
  range: { name: '千里眼', desc: '射程 +8%' },
  heal: { name: '手当て', desc: '村人を満タンに戻す' },
};

export function towerMods(buffs: BuffId[]): BattleMods {
  const n = (id: BuffId) => buffs.filter((b) => b === id).length;
  return {
    atkMul: 1 + n('atk') * 0.12,
    critAdd: n('crit') * 0.06,
    spAdd: n('sp') * 0.25,
    coinMul: 1 + n('coin') * 0.25,
    rangeAdd: n('range') * 0.08,
  };
}

export function startTower(p: Progress): void {
  const v = villagersOf(p);
  p.tower.runs += 1;
  p.tower.run = { floor: 1, buffs: [], villagers: v, maxVillagers: v, seed: hashSeed(p.seed, 'tower', p.tower.runs), choosing: null };
}

function buffChoices(seed: number, floor: number): BuffId[] {
  const r: Rng = { s: hashSeed(seed, 'buff', floor) };
  return shuffle(r, Object.keys(BUFFS) as BuffId[]).slice(0, 3);
}

/** 階の点数 */
export function floorScore(floor: number, lost: number): number {
  return floor * 100 + Math.max(0, 50 - lost * 10);
}

/** 階の結果を入れる。勝てば次の階と恩恵の候補、負ければ終わり */
export function towerResult(p: Progress, win: boolean, villagersLeft: number, lost: number): { floor: number; ended: boolean; newBest: boolean } {
  const run = p.tower.run;
  if (!run) return { floor: 0, ended: true, newBest: false };
  const floor = run.floor;
  let newBest = false;
  if (win) {
    p.tower.score += floorScore(floor, lost);
    if (floor > p.tower.best) { p.tower.best = floor; newBest = true; }
    run.villagers = villagersLeft;
    run.floor += 1;
    run.choosing = buffChoices(run.seed, floor);
    return { floor, ended: false, newBest };
  }
  p.tower.run = null;
  return { floor, ended: true, newBest };
}

export function chooseBuff(p: Progress, id: BuffId): boolean {
  const run = p.tower.run;
  if (!run || !run.choosing || !run.choosing.includes(id)) return false;
  run.buffs.push(id);
  if (id === 'lives') { run.maxVillagers += 2; run.villagers += 2; }
  if (id === 'heal') run.villagers = run.maxVillagers;
  run.choosing = null;
  return true;
}

// ── 毎日の挑戦 ──

export type DailyRule = 'sky' | 'metal' | 'noRest' | 'fast' | 'bossRush';
export const DAILY_RULES: Record<DailyRule, { name: string; desc: string }> = {
  sky: { name: '空の日', desc: '飛行の敵ばかり。狩の系統の出番。' },
  metal: { name: 'はがね祭り', desc: 'メタルが群れで来る。倒せば大もうけ。' },
  noRest: { name: '休めない日', desc: '休憩が効かない。' },
  fast: { name: '疾風の日', desc: '敵が速い（その分すこし柔らかい）。' },
  bossRush: { name: 'ボス連戦', desc: '章のボスが続けてやって来る。' },
};

/** 端末の日付（YYYY-MM-DD） */
export function dateKey(d: Date = new Date()): string {
  const z = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
}

export function dailyRule(date: string): DailyRule {
  const r: Rng = { s: hashSeed('daily', date) };
  return pick(r, Object.keys(DAILY_RULES) as DailyRule[]);
}

export function dailyDef(p: Progress, date: string): { def: StageDef; mods: BattleMods; rule: DailyRule } {
  const rule = dailyRule(date);
  const r: Rng = { s: hashSeed('daily', date, 'groups') };
  const sid = Math.max(3, Math.min(STAGE_COUNT, p.unlocked));
  const c = Math.min(CHAPTERS.length, Math.ceil(sid / PER_CHAPTER));
  const pool = CHAPTERS[c - 1].pool;
  let groups: Group[];
  let mods: BattleMods = {};
  let hpMul = 1;
  let boss = false;
  switch (rule) {
    case 'sky': {
      const flyers = [pool.fly, 'hawk', 'shadowBat', 'diveHawk', 'bat'];
      groups = groupsFor(pool, c, 3).map((gr, i) => ({ ...gr, enemy: flyers[(i + int(r, 5)) % flyers.length] }));
      break;
    }
    case 'metal':
      groups = [...groupsFor(pool, c, 5), { enemy: 'metalSlime', count: 8 + c * 2, every: 1, at: 12, lane: 'rand' }];
      hpMul = 0.9;
      break;
    case 'noRest': groups = groupsFor(pool, c, 6); mods = { noRest: true }; break;
    case 'fast': groups = groupsFor(pool, c, 2); mods = { enemySpeedMul: 1.4 }; hpMul = 0.75; break;
    default: {
      boss = true;
      const bosses = [CHAPTERS[Math.max(0, c - 3)].pool.boss, CHAPTERS[Math.max(0, c - 2)].pool.boss, pool.boss];
      groups = [
        { enemy: pool.base, count: 8, every: 1.2, at: 0, lane: 'alt' },
        ...bosses.map((b, i) => ({ enemy: b, count: 1, every: 1, at: 8 + i * 22, lane: 1 as const, hpMul: 0.45 + i * 0.15 })),
        { enemy: pool.fast, count: 10, every: 0.7, at: 20, lane: 'rand' },
      ];
    }
  }
  const def: StageDef = {
    id: DAILY_ID, chapter: c, name: DAILY_RULES[rule].name, boss, groups, scale: 1,
    restExp: Math.round(14 * Math.pow(baseScale(sid), 0.9)),
    hpScale: baseScale(sid) * smoothCalib(sid) * hpMul * (p.mode === 'pro' ? 1.2 : 1),
    rewardScale: Math.pow(baseScale(sid), 0.9) * 1.2,
    tier: sid + 2,
  };
  return { def, mods, rule };
}

/** 毎日の挑戦の結果。今日はじめて勝つと宝箱（良以上）がもらえる。もらえる時 true */
export function dailyResult(p: Progress, date: string, win: boolean, score: number): boolean {
  if (p.daily.date !== date) p.daily = { date, cleared: false, best: 0 };
  p.daily.best = Math.max(p.daily.best, win ? score : 0);
  if (win && !p.daily.cleared) { p.daily.cleared = true; return true; }
  return false;
}
