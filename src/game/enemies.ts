// 敵：通常・飛行・メタル × 速く柔らかい／遅く硬い、と章ごとのボス（絵は既存の生成画像）
import type { EnemyDef } from './types';

const E = (e: EnemyDef): EnemyDef => e;
const S = (index: number) => ({ sheet: 'enemySheet' as const, index });
const F = (name: string) => ({ file: `/assets/game/enemies/${name}.png` });

export const ENEMIES: Record<string, EnemyDef> = Object.fromEntries([
  E({ id: 'slime', name: 'スライム', kind: 'normal', hp: 40, speed: 55, lives: 1, exp: 4, coin: 3, art: S(0), size: 72, desc: 'ふつうの敵。' }),
  E({ id: 'chick', name: 'はしりどり', kind: 'normal', hp: 22, speed: 128, lives: 1, exp: 3, coin: 2, art: S(1), size: 82, desc: '速く柔らかい。群れで駆け抜ける。' }),
  E({ id: 'bat', name: 'こうもり', kind: 'fly', hp: 30, speed: 82, lives: 1, exp: 4, coin: 3, art: S(2), size: 80, hover: 70, desc: '飛行。道を無視して城門へ飛ぶ。剣は当たりにくい。' }),
  E({ id: 'blueSlime', name: 'あおスライム', kind: 'normal', hp: 95, speed: 50, lives: 1, exp: 7, coin: 5, art: S(3), size: 80, desc: '少し硬い。' }),
  E({ id: 'worm', name: 'すなもぐら', kind: 'normal', hp: 430, speed: 27, lives: 2, exp: 24, coin: 16, art: S(4), size: 124, desc: '遅く硬い。抜けると村人が2人減る。' }),
  E({ id: 'hawk', name: 'ひのとり', kind: 'fly', hp: 48, speed: 150, lives: 1, exp: 6, coin: 4, art: S(6), size: 96, hover: 80, desc: '速い飛行。' }),
  E({ id: 'batSwarm', name: 'こうもりの群れ', kind: 'fly', elite: true, hp: 380, speed: 44, lives: 2, exp: 26, coin: 18, art: S(7), size: 124, hover: 60, desc: '硬い飛行。' }),
  E({ id: 'metalSlime', name: 'はがねスライム', kind: 'metal', hp: 9, speed: 72, lives: 1, exp: 45, coin: 30, art: S(8), size: 72, desc: 'メタル。ふつうの攻撃は1しか通らない。倒すと EXP と金貨が多い。' }),
  E({ id: 'goblin', name: 'ゴブリン', kind: 'normal', hp: 62, speed: 70, lives: 1, exp: 5, coin: 4, art: F('enemy_goblin'), size: 92, desc: 'すばしこい小鬼。' }),
  E({ id: 'orc', name: 'オーク', kind: 'normal', hp: 620, speed: 30, lives: 2, exp: 30, coin: 20, art: F('enemy_orc'), size: 132, desc: '遅く硬い大鬼。' }),
  E({ id: 'wolf', name: 'まだらおおかみ', kind: 'normal', elite: true, hp: 170, speed: 138, lives: 1, exp: 14, coin: 10, art: F('enemy_wolf_elite'), size: 112, desc: '速くて少し硬い。' }),
  E({ id: 'wingbat', name: 'つばさこうもり', kind: 'fly', hp: 70, speed: 96, lives: 1, exp: 7, coin: 5, art: F('enemy_wingbat'), size: 96, hover: 75, desc: '飛行。' }),
  // ── ボス（章ごと） ──
  E({ id: 'kingSlime', name: 'スライムの王', kind: 'normal', boss: true, hp: 2600, speed: 22, lives: 5, exp: 300, coin: 200, art: S(5), size: 190, desc: '第1章のボス。とても硬い。' }),
  E({ id: 'orcLord', name: 'オークの将', kind: 'normal', boss: true, hp: 5200, speed: 20, lives: 5, exp: 600, coin: 400, art: F('enemy_orc'), size: 230, desc: '第2章のボス。' }),
  E({ id: 'batLord', name: '夜の群れ王', kind: 'fly', boss: true, hp: 7000, speed: 26, lives: 5, exp: 900, coin: 600, art: S(7), size: 220, hover: 70, desc: '第3章のボス。空から来る。' }),
  E({ id: 'wormKing', name: '大すなもぐら', kind: 'normal', boss: true, hp: 11000, speed: 18, lives: 6, exp: 1300, coin: 900, art: S(4), size: 230, desc: '第4章のボス。' }),
  E({ id: 'scorpion', name: '紫晶のさそり', kind: 'normal', boss: true, hp: 16000, speed: 17, lives: 10, exp: 2500, coin: 1500, art: S(9), size: 240, desc: '最後のボス。' }),
].map((e) => [e.id, e]));

export function enemy(id: string): EnemyDef {
  const e = ENEMIES[id];
  if (!e) throw new Error(`unknown enemy ${id}`);
  return e;
}

/** ステージの倍率をかけた体力（メタルは伸びをゆるく） */
export function enemyHp(e: EnemyDef, scale: number, hpMul = 1): number {
  const s = e.kind === 'metal' ? Math.pow(scale, 0.72) : scale;
  return Math.max(1, Math.round(e.hp * s * hpMul));
}
