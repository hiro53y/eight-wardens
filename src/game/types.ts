// ゲームの型（DOM に依存しない）

/** 職業の系統：剣・狩・盗 */
export type Line = 'sword' | 'hunt' | 'thief';

/** 速さの等級（攻撃の間隔） */
export type Grade = 'SSS' | 'SS' | 'S' | 'A+' | 'A' | 'B+' | 'B' | 'C+' | 'C' | 'D' | 'E+' | 'E' | 'F' | 'G';

export type Mode = 'normal' | 'pro';

export interface JobDef {
  id: string;
  name: string;
  line: Line;
  tier: 1 | 2 | 3;
  /** レベルごとの攻撃力（1段・2段は Lv0〜3、3段は Lv0〜10） */
  atk: number[];
  grade: Grade;
  /** 射程（戦場の論理座標） */
  range: number;
  /** どこでも届く */
  rangeAll?: boolean;
  /** 前方（まだ自分を通り過ぎていない敵）だけを狙う */
  front?: boolean;
  /** 飛行への倍率（0 なら狙えない） */
  fly: number;
  /** 飛行だけを狙う */
  flyOnly?: boolean;
  /** メタルへの通り（攻撃力に掛ける割合。0 なら1だけ） */
  metal: number;
  /** 当てた敵の鎧を剥ぐ秒数（メタルにも全員の攻撃が通る） */
  armorBreak?: number;
  /** 鈍化：速さの倍率と秒数（Infinity なら治らない） */
  slow?: { factor: number; dur: number };
  /** 停止の秒数 */
  stop?: number;
  /** 押し戻す距離 */
  knock?: number;
  /** 守り下げ：受ける打撃の上乗せと秒数 */
  defDown?: { amount: number; dur: number };
  /** 止めを刺すと金貨3倍 */
  coin3?: boolean;
  /** 当てるたびに金貨（レベルで減る） */
  coinOnHit?: number;
  /** 休憩中に1秒あたりの金貨 */
  restCoin?: number;
  /** 倒すたびに攻撃力が伸びる割合 */
  killGrow?: number;
  /** 3段目でレベルを金貨で上げる（盗の系統） */
  coinLevel?: boolean;
  next: string[];
  /** 演出の種類 */
  fx: 'slash' | 'spear' | 'arrow' | 'bullet' | 'cannon' | 'shuriken' | 'magic' | 'chain' | 'potion' | 'dragon';
  desc: string;
}

export interface Warden {
  id: string;
  name: string;
  /** ちびキャラの番号（1枚絵の0〜7） */
  sprite: number;
  job: string;
  lv: number;
  /** 上限突破の回数（攻撃力 +10% ずつ） */
  limit: number;
  /** 置いている台座（0〜11） */
  pedestal: number;
  resting: boolean;
  /** 休憩ゲージ（0〜1） */
  rest: number;
  /** 暗黒騎士の伸び（倒した数） */
  kills: number;
}

export type EnemyKind = 'normal' | 'fly' | 'metal';

export interface EnemyDef {
  id: string;
  name: string;
  kind: EnemyKind;
  boss?: boolean;
  elite?: boolean;
  /** 基本の体力（ステージで伸びる） */
  hp: number;
  /** 速さ（論理座標/秒） */
  speed: number;
  /** 村に入った時に減る村人 */
  lives: number;
  exp: number;
  coin: number;
  /** 絵 */
  art: { sheet: 'enemySheet'; index: number } | { file: string };
  /** 描く大きさ（高さ） */
  size: number;
  /** 地面から浮かせる高さ（飛行） */
  hover?: number;
  desc: string;
}

/** ステージの群れ */
export interface Group {
  enemy: string;
  count: number;
  /** 出てくる間隔（秒） */
  every: number;
  /** 群れが始まるまでの時間（前の群れの始めから） */
  at: number;
  /** 道：0〜2、'alt' は交互、'rand' はでたらめ */
  lane: 0 | 1 | 2 | 'alt' | 'rand';
  /** 体力の倍率（エリートなど） */
  hpMul?: number;
}

export interface StageDef {
  id: number;
  chapter: number;
  name: string;
  boss: boolean;
  groups: Group[];
  /** 敵の体力・報酬の倍率 */
  scale: number;
  /** 休憩の EXP の基本 */
  restExp: number;
}

export interface Progress {
  v: number;
  seed: number;
  mode: Mode;
  /** 次に挑むステージ（解放済みの最大） */
  unlocked: number;
  /** ステージごとの星 */
  stars: Record<number, number>;
  exp: number;
  coins: number;
  villagers: number;
  maxVillagers: number;
  /** 越えたボスの数（休憩の EXP が増える） */
  bosses: number;
  score: number;
  wardens: Warden[];
  /** 最後のボスを倒した */
  cleared?: boolean;
  stats: { kills: number; lost: number; battles: number; restExp: number };
}

export interface Settings { bgm: number; se: number; speed: 1 | 2 | 3; numbers: boolean }
export const DEFAULT_SETTINGS: Settings = { bgm: 0.5, se: 0.7, speed: 1, numbers: true };
