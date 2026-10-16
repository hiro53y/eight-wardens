// ステージ：5章×7（各章の7番目がボス、35が最後のボス）。章ごとの敵の顔ぶれと、7つの型（導入・速い群れ・飛行・硬い・メタル・混合・ボス）
import type { Group, Mode, StageDef } from './types';

export const STAGE_COUNT = 35;
export const PER_CHAPTER = 7;

export interface ChapterDef {
  id: number;
  name: string;
  /** 戦場の時刻（色の重ね） */
  tint: 'day' | 'evening' | 'night' | 'desert' | 'abyss';
  /** 敵の色違い（canvas の filter） */
  hue: number;
  pool: { base: string; fast: string; fly: string; hard: string; heavy: string; metal: string; boss: string; special: string[] };
  bgm: string;
}

export const CHAPTERS: ChapterDef[] = [
  { id: 1, name: '緑風の平原', tint: 'day', hue: 0, pool: { base: 'slime', fast: 'chick', fly: 'bat', hard: 'blueSlime', heavy: 'worm', metal: 'metalSlime', boss: 'kingSlime', special: ['splitSlime'] }, bgm: 'stage-1' },
  { id: 2, name: 'ゴブリンの森', tint: 'evening', hue: 0, pool: { base: 'goblin', fast: 'wolf', fly: 'wingbat', hard: 'blueSlime', heavy: 'orc', metal: 'metalSlime', boss: 'orcLord', special: ['shieldGoblin', 'shaman'] }, bgm: 'stage-3' },
  { id: 3, name: '夜の峡谷', tint: 'night', hue: 200, pool: { base: 'bat', fast: 'hawk', fly: 'wingbat', hard: 'blueSlime', heavy: 'batSwarm', metal: 'metalSlime', boss: 'batLord', special: ['shadowBat', 'diveHawk', 'splitSlime'] }, bgm: 'stage-5' },
  { id: 4, name: '砂の荒野', tint: 'desert', hue: 30, pool: { base: 'chick', fast: 'wolf', fly: 'hawk', hard: 'orc', heavy: 'worm', metal: 'metalSlime', boss: 'wormKing', special: ['rageWolf', 'shieldGoblin', 'diveHawk'] }, bgm: 'stage-7' },
  { id: 5, name: '紫晶の魔境', tint: 'abyss', hue: 260, pool: { base: 'goblin', fast: 'wolf', fly: 'hawk', hard: 'batSwarm', heavy: 'orc', metal: 'metalSlime', boss: 'scorpion', special: ['shaman', 'shadowBat', 'rageWolf', 'splitSlime'] }, bgm: 'stage-9' },
];

const STAGE_NAMES = [
  ['村の入口', '駆ける小鳥', 'こうもりの夜', '硬い行列', 'はがねの影', '入り混じる群れ', 'スライムの王'],
  ['森の小道', '狼の遠吠え', '翼の影', '大鬼の行進', '森のはがね', '木漏れ日の乱戦', 'オークの将'],
  ['峡谷の入口', '火の鳥', '群れなす翼', '夜の行軍', '月下のはがね', '闇の乱戦', '夜の群れ王'],
  ['砂の道', '砂塵の狼', '灼熱の空', 'もぐらの穴', '砂漠のはがね', '蜃気楼の乱戦', '大すなもぐら'],
  ['魔境の門', '紫の疾風', '空を覆うもの', '魔境の行軍', '晶のはがね', '最後の乱戦', '紫晶のさそり'],
];

const g = (enemy: string, count: number, every: number, at: number, lane: Group['lane'], hpMul?: number): Group => ({ enemy, count: Math.max(1, Math.round(count)), every, at, lane, hpMul });

/** 基本の倍率（報酬・休憩の EXP。ステージで伸びる） */
export function baseScale(id: number): number {
  return Math.pow(1.165, id - 1);
}

/** ステージごとの硬さの調整（上手なボットが初回に村人を2人ほど失う強さの8割。人が遊ぶ分のゆとり。1・2は手で下げた） */
export const HP_CALIB: number[] = [
  3.0, 4.0, 5.66, 5.59, 3.26, 5.77, 4.06,
  5.4, 1.52, 4.16, 4.5, 2.39, 1.69, 1.74,
  14.8, 4.46, 5.13, 6.31, 12.75, 8.09, 4.14,
  6.44, 3.06, 5.11, 7.01, 4.38, 2.2, 1.66,
  5.24, 3.06, 3.47, 4.41, 2.98, 1.1, 0.87,
];

/** 敵の体力の倍率 */
export function stageScale(id: number, mode: Mode): number {
  return baseScale(id) * (HP_CALIB[id - 1] ?? 1) * (mode === 'pro' ? 1.1 + (0.5 * (id - 1)) / 34 : 1);
}

/** 型ごとの群れ（k：1 導入・2 速い群れ・3 飛行・4 硬い・5 メタル・6 混合・7 ボス） */
export function groupsFor(p: ChapterDef['pool'], c: number, k: number, last = false): Group[] {
  const m = 1 + (c - 1) * 0.35;
  let groups: Group[];
  switch (k) {
    case 1: groups = [g(p.base, 8 * m, 1.6, 0, 'alt'), g(p.base, 6 * m, 1.2, 14, 'rand'), g(p.fast, 4 * m, 0.8, 24, 'rand')]; break;
    case 2: groups = [g(p.fast, 10 * m, 0.7, 0, 'alt'), g(p.base, 8 * m, 1.2, 9, 'rand'), g(p.fly, 4 * m, 1.5, 18, 'rand')]; break;
    case 3: groups = [g(p.fly, 8 * m, 1.2, 0, 'rand'), g(p.base, 8 * m, 1.1, 8, 'alt'), g(p.fly, 6 * m, 0.9, 18, 'rand'), g(p.fast, 6 * m, 0.6, 26, 'rand')]; break;
    case 4: groups = [g(p.heavy, 2 + c, 5, 0, 'alt'), g(p.base, 10 * m, 1, 4, 'rand'), g(p.hard, 6 * m, 1.4, 14, 'alt'), g(p.fly, 5 * m, 1, 22, 'rand')]; break;
    case 5: groups = [g(p.metal, 3 + c, 2.5, 0, 'rand'), g(p.base, 10 * m, 0.9, 6, 'alt'), g(p.fast, 8 * m, 0.6, 15, 'rand'), g(p.metal, 2 + c, 2, 24, 'rand'), g(p.fly, 6 * m, 0.9, 26, 'rand')]; break;
    case 6: groups = [g(p.hard, 6 * m, 1.4, 0, 'alt', 1.5), g(p.heavy, 2 + c, 4, 6, 'rand'), g(p.fast, 10 * m, 0.5, 12, 'rand'), g(p.fly, 8 * m, 0.8, 20, 'rand'), g(p.metal, 3, 2, 28, 'rand')]; break;
    default:
      groups = [g(p.base, 8 * m, 1.2, 0, 'alt'), g(p.boss, 1, 1, 12, 1), g(p.fast, 8 * m, 0.7, 16, 'rand'), g(p.fly, 6 * m, 1, 24, 'rand'), g(p.hard, 6 * m, 1.2, 34, 'alt')];
      if (last) groups.push(g(p.heavy, 4, 3, 44, 'rand', 1.4), g(p.fast, 14, 0.4, 50, 'rand'), g(p.metal, 6, 1.5, 56, 'rand'));
  }
  // 技を持つ敵（1章は6番目だけ、2章からは毎回）
  if (p.special.length && (c > 1 || k === 6) && k < PER_CHAPTER) {
    groups.push(g(p.special[(k - 1) % p.special.length], (3 + c) * (k === 6 ? 1.5 : 1), 1.5, 10 + k * 2, 'rand'));
  }
  return groups;
}

function build(id: number): StageDef {
  const c = Math.ceil(id / PER_CHAPTER);
  const k = id - (c - 1) * PER_CHAPTER;
  const groups = groupsFor(CHAPTERS[c - 1].pool, c, k, id === STAGE_COUNT);
  return { id, chapter: c, name: STAGE_NAMES[c - 1][k - 1], boss: k === PER_CHAPTER, groups, scale: 1, restExp: Math.round(14 * Math.pow(baseScale(id), 0.9)), tier: id };
}

/** 硬さの調整をならした値（塔・毎日の挑戦で使う） */
export function smoothCalib(id: number): number {
  const lo = Math.max(1, id - 3), hi = Math.min(STAGE_COUNT, id + 3);
  let sum = 0;
  for (let i = lo; i <= hi; i++) sum += Math.log(HP_CALIB[i - 1] ?? 1);
  return Math.exp(sum / (hi - lo + 1));
}

export const STAGES: StageDef[] = Array.from({ length: STAGE_COUNT }, (_, i) => build(i + 1));

export function stage(id: number): StageDef {
  const s = STAGES[id - 1];
  if (!s) throw new Error(`unknown stage ${id}`);
  return s;
}

export function chapterOf(id: number): ChapterDef {
  return CHAPTERS[Math.min(CHAPTERS.length, Math.max(1, Math.ceil(id / PER_CHAPTER))) - 1];
}

/** ステージに出る敵の種類 */
export function stageEnemies(id: number): string[] {
  return [...new Set(stage(id).groups.map((x) => x.enemy))];
}

/** 敵の総数 */
export function stageEnemyCount(id: number): number {
  return stage(id).groups.reduce((s, x) => s + x.count, 0);
}
