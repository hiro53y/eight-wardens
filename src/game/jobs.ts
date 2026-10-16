// 職業：剣・狩・盗の3系統×3段（21職）。攻撃力・速さの等級・射程・特殊能力は元のゲームの表を写し、射程は戦場の大きさに合わせて伸ばす
import type { Grade, JobDef, Line, Mode } from './types';

/** 元の射程を戦場の論理座標に直す倍率 */
const R = 1.4;

/** 速さの等級 → 攻撃の間隔（秒） */
export const GRADE_INTERVAL: Record<Grade, number> = {
  SSS: 0.22, SS: 0.32, S: 0.42, 'A+': 0.52, A: 0.62, 'B+': 0.74, B: 0.88, 'C+': 1.02, C: 1.18, D: 1.45, 'E+': 1.75, E: 2.05, F: 2.55, G: 3.1,
};

const J = (j: JobDef): JobDef => j;

export const JOBS: Record<string, JobDef> = Object.fromEntries([
  // ── 剣の系統 ──
  J({ id: 'swordsman', name: '剣士', line: 'sword', tier: 1, atk: [16, 24, 50, 100], grade: 'B', range: 180 * R, fly: 0.5, metal: 0, skill: 'whirl', next: ['warrior', 'knight'], fx: 'slash', desc: '剣の基本。地上の敵を確実に斬る。' }),
  J({ id: 'warrior', name: '武士', line: 'sword', tier: 2, atk: [150, 250, 400, 750], grade: 'C', range: 180 * R, fly: 0.5, metal: 0.25, skill: 'whirl', next: ['samurai', 'magicSword'], fx: 'slash', desc: '重い一太刀。メタルにも打撃が通る。' }),
  J({ id: 'knight', name: '騎士', line: 'sword', tier: 2, atk: [70, 100, 150, 280], grade: 'A', range: 250 * R, fly: 1, metal: 0, skill: 'whirl', next: ['darkKnight', 'dragonKnight'], fx: 'spear', desc: '速い槍さばき。飛行の敵にもよく当たる。' }),
  J({ id: 'samurai', name: '侍', line: 'sword', tier: 3, atk: [1200, 1500, 1800, 2100, 2400, 3000, 3600, 4500, 6000, 9000, 15000], grade: 'B', range: 180 * R, fly: 0.5, metal: 0.6, skill: 'issen', next: [], fx: 'slash', desc: 'メタルを両断する達人。' }),
  J({ id: 'magicSword', name: '魔剣士', line: 'sword', tier: 3, atk: [2500, 3200, 3800, 4400, 5000, 6200, 7400, 9300, 12000, 18000, 30000], grade: 'D', range: 150 * R, fly: 0.5, metal: 0, slow: { factor: 0.55, dur: Infinity }, skill: 'seal', next: [], fx: 'magic', desc: '斬った敵を治らない鈍化にする。みんなの攻撃が当たる回数が増える。' }),
  J({ id: 'darkKnight', name: '暗黒騎士', line: 'sword', tier: 3, atk: [800, 1000, 1200, 1400, 1600, 1900, 2200, 2600, 3200, 4200, 6000], grade: 'B+', range: 260 * R, fly: 1, metal: 0, killGrow: 0.004, skill: 'darkwave', next: [], fx: 'slash', desc: '倒すたびに強くなる（1体ごとに+0.4%、最大+100%）。' }),
  J({ id: 'dragonKnight', name: '竜騎士', line: 'sword', tier: 3, atk: [1200, 1800, 2400, 3000, 3600, 4200, 5000, 6300, 8400, 12000, 21000], grade: 'F', range: 0, rangeAll: true, flyOnly: true, fly: 1, metal: 0, skill: 'dragonfall', next: [], fx: 'dragon', desc: '飛行の敵だけを、戦場のどこまでも追って突く。地上は狙えない。' }),
  // ── 狩の系統 ──
  J({ id: 'hunter', name: '狩人', line: 'hunt', tier: 1, atk: [10, 16, 40, 80], grade: 'C+', range: 280 * R, fly: 2, metal: 0, skill: 'arrowRain', next: ['bowman', 'gunner'], fx: 'arrow', desc: '遠くから射る。飛行の敵に大きな打撃。' }),
  J({ id: 'bowman', name: '弓術士', line: 'hunt', tier: 2, atk: [80, 120, 180, 250], grade: 'B+', range: 340 * R, fly: 2, metal: 0, skill: 'arrowRain', next: ['ranger', 'thrower'], fx: 'arrow', desc: '速く遠い弓。飛行の敵に大きな打撃。' }),
  J({ id: 'gunner', name: '銃士', line: 'hunt', tier: 2, atk: [100, 150, 250, 400], grade: 'C', range: 400 * R, front: true, fly: 2, metal: 0, skill: 'snipe', next: ['sniper', 'cannoneer'], fx: 'bullet', desc: '前から来る敵だけを遠くから撃つ。' }),
  J({ id: 'ranger', name: '遊撃士', line: 'hunt', tier: 3, atk: [300, 400, 500, 600, 700, 850, 1000, 1250, 1600, 2400, 4000], grade: 'S', range: 400 * R, fly: 3, metal: 0, skill: 'arrowRain', next: [], fx: 'arrow', desc: '矢の雨のような連射。飛行の敵を蹴散らす。' }),
  J({ id: 'thrower', name: '投擲士', line: 'hunt', tier: 3, atk: [400, 600, 800, 1000, 1200, 1400, 1700, 2100, 2800, 4200, 7000], grade: 'A+', range: 400 * R, fly: 1.5, metal: 0.2, armorBreak: 3, skill: 'armorCrush', next: [], fx: 'spear', desc: '当てたメタルの鎧を剥ぐ（3秒、全員の攻撃が通る）。' }),
  J({ id: 'sniper', name: '狙撃士', line: 'hunt', tier: 3, atk: [2000, 2600, 3200, 3800, 4400, 5400, 6600, 8200, 11000, 16000, 27000], grade: 'D', range: 0, rangeAll: true, fly: 3, metal: 0, skill: 'snipe', next: [], fx: 'bullet', desc: '戦場のどこでも撃ち抜く。飛行に特大の打撃。' }),
  J({ id: 'cannoneer', name: '砲術士', line: 'hunt', tier: 3, atk: [1000, 1400, 1800, 2200, 2600, 3000, 3600, 4500, 6000, 9000, 15000], grade: 'E', range: 400 * R, fly: 1.5, metal: 0, knock: 70, skill: 'bigCannon', next: [], fx: 'cannon', desc: '砲弾で敵を押し戻す。' }),
  // ── 盗の系統 ──
  J({ id: 'thief', name: '盗賊', line: 'thief', tier: 1, atk: [4, 10, 20, 40], grade: 'A+', range: 150 * R, fly: 0.5, metal: 0, coin3: true, skill: 'smoke', next: ['ninja', 'engineer'], fx: 'shuriken', desc: '止めを刺すと金貨が3倍。' }),
  J({ id: 'ninja', name: '忍者', line: 'thief', tier: 2, atk: [30, 40, 60, 120], grade: 'SS', range: 150 * R, fly: 0.5, metal: 0, coin3: true, skill: 'smoke', next: ['assassin', 'pirate'], fx: 'shuriken', desc: 'とても速い手裏剣。止めで金貨3倍。' }),
  J({ id: 'engineer', name: '技師', line: 'thief', tier: 2, atk: [10, 20, 30, 50], grade: 'C+', range: 120, fly: 0.5, metal: 0, slow: { factor: 0.6, dur: 2.5 }, stop: 0.4, skill: 'net', next: ['trapper', 'alchemist'], fx: 'chain', desc: '罠で鈍らせ、少しのあいだ止める。' }),
  J({ id: 'assassin', name: '暗殺者', line: 'thief', tier: 3, atk: [200, 250, 300, 350, 400, 500, 600, 750, 1000, 1500, 2500], grade: 'SSS', range: 200 * R, fly: 0.5, metal: 0, coin3: true, coinLevel: true, skill: 'shadow', next: [], fx: 'shuriken', desc: '目にもとまらぬ連撃。止めで金貨3倍。レベルは金貨で上げる。' }),
  J({ id: 'pirate', name: '海賊', line: 'thief', tier: 3, atk: [800, 1000, 1200, 1400, 1600, 2000, 2500, 3000, 4000, 6000, 10000], grade: 'C+', range: 250 * R, fly: 0.7, metal: 0, coinOnHit: 6, coinLevel: true, skill: 'plunder', next: [], fx: 'slash', desc: '当てるたびに金貨を奪う（レベルが上がると減る）。レベルは金貨で上げる。' }),
  J({ id: 'trapper', name: '捕縛士', line: 'thief', tier: 3, atk: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], grade: 'E+', range: 140, fly: 1, metal: 0, stop: 2.2, skill: 'net', next: [], fx: 'chain', desc: '縄で敵を長く止める（ボスには短い）。打撃は無い。' }),
  J({ id: 'alchemist', name: '錬金術師', line: 'thief', tier: 3, atk: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], grade: 'E+', range: 250 * R, fly: 1, metal: 0, defDown: { amount: 0.3, dur: 4 }, restCoin: 3, skill: 'goldRain', next: [], fx: 'potion', desc: '薬で敵の守りを下げる（受ける打撃+30%）。休憩中は金貨を作る。' }),
].map((j) => [j.id, j]));

export const LINE_NAME: Record<Line, string> = { sword: '剣', hunt: '狩', thief: '盗' };
export const LINE_COLOR: Record<Line, string> = { sword: '#6d93e4', hunt: '#6fbf5a', thief: '#b07ad8' };

export function job(id: string): JobDef {
  const j = JOBS[id];
  if (!j) throw new Error(`unknown job ${id}`);
  return j;
}

/** その職の最大レベル */
export function maxLv(j: JobDef, mode: Mode): number {
  if (j.tier < 3) return 3;
  return mode === 'pro' ? 10 : 5;
}

/** 攻撃の間隔（秒） */
export function interval(j: JobDef): number {
  return GRADE_INTERVAL[j.grade];
}

/** 攻撃力（上限突破と暗黒騎士の伸びを含む） */
export function attackOf(j: JobDef, lv: number, limit = 0, kills = 0): number {
  const base = j.atk[Math.min(lv, j.atk.length - 1)];
  const grow = j.killGrow ? 1 + Math.min(1, kills * j.killGrow) : 1;
  return Math.round(base * (1 + limit * 0.1) * grow);
}

/** レベルを1上げる値段（EXP、盗の3段は金貨） */
export function levelCost(j: JobDef, lv: number): { exp: number; coins: number } {
  if (j.tier === 1) return { exp: [20, 60, 150][lv] ?? 0, coins: 0 };
  if (j.tier === 2) return { exp: [400, 900, 1800][lv] ?? 0, coins: 0 };
  const v = Math.round(3000 * Math.pow(1.55, lv) / 10) * 10;
  return j.coinLevel ? { exp: 0, coins: Math.round(v * 0.6 / 10) * 10 } : { exp: v, coins: 0 };
}

/** 転職の値段（金貨） */
export function promoteCost(to: JobDef, mode: Mode): number {
  const base = to.tier === 2 ? 300 : 2500;
  return mode === 'pro' ? Math.round(base * 1.5) : base;
}

/** 上限突破の値段（金貨）。5回まで、1回で攻撃力+10% */
export const MAX_LIMIT = 5;
export function limitCost(limit: number): number {
  return 5000 * (limit + 1);
}

/** 特殊能力のレベルによる伸び */
export function slowFactor(j: JobDef, lv: number): number {
  return j.slow ? Math.max(0.3, j.slow.factor - lv * 0.025) : 1;
}
export function stopTime(j: JobDef, lv: number): number {
  return j.stop ? j.stop + (j.tier === 3 ? lv * 0.18 : lv * 0.05) : 0;
}
export function coinOnHit(j: JobDef, lv: number): number {
  return j.coinOnHit ? Math.max(1, j.coinOnHit - Math.floor(lv / 2)) : 0;
}
export function defDownOf(j: JobDef, lv: number): number {
  return j.defDown ? j.defDown.amount + lv * 0.03 : 0;
}
export function restCoinOf(j: JobDef, lv: number): number {
  return j.restCoin ? j.restCoin + lv : 0;
}
