// ゲームの型（DOM に依存しない）

/** 職業の系統：剣・狩・盗 */
export type Line = 'sword' | 'hunt' | 'thief';

/** 速さの等級（攻撃の間隔） */
export type Grade = 'SSS' | 'SS' | 'S' | 'A+' | 'A' | 'B+' | 'B' | 'C+' | 'C' | 'D' | 'E+' | 'E' | 'F' | 'G';

export type Mode = 'normal' | 'pro';

/** 必殺技 */
export type SkillId =
  | 'whirl' | 'issen' | 'seal' | 'darkwave' | 'dragonfall'
  | 'arrowRain' | 'snipe' | 'bigCannon' | 'armorCrush'
  | 'smoke' | 'shadow' | 'plunder' | 'net' | 'goldRain';

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
  /** 必殺技 */
  skill: SkillId;
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
  /** 必殺技のゲージ（0〜1） */
  sp: number;
  /** 装備（持ち物の id） */
  equip: { weapon: number | null; charm: number | null };
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
  /** 色違い（絵の色相をずらす度数） */
  hue?: number;
  /** 印（盾・回復・狂化・降下・分裂） */
  badge?: 'shield' | 'heal' | 'rage' | 'dive' | 'split';
  /** 倒すと分かれる先の敵 */
  split?: string;
  /** 打撃が半分（鎧はがし・守り下げで解ける） */
  shield?: boolean;
  /** 周りの敵を回復 */
  healer?: boolean;
  /** 近くか、当てられてからしか狙えない */
  stealth?: boolean;
  /** 飛行のまま途中で地上に降りる（飛ぶ道の割合） */
  dive?: number;
  /** 体力が半分を切ると速くなる */
  rage?: boolean;
  /** ボスの技 */
  bossSkills?: BossSkill[];
  /** 呼ぶ手下 */
  summon?: string;
  /** 描く大きさの倍率（分裂した小さい敵） */
  scale?: number;
}

export type BossSkill = 'summon' | 'charge' | 'roar' | 'regen' | 'burrow' | 'dive';

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
  /** 本編は 1〜35、塔は 1000+階、毎日の挑戦は 2000 */
  id: number;
  chapter: number;
  name: string;
  boss: boolean;
  groups: Group[];
  /** 敵の体力・報酬の倍率 */
  scale: number;
  /** 休憩の EXP の基本 */
  restExp: number;
  /** 硬さの倍率（塔・毎日の挑戦。本編は stageScale） */
  hpScale?: number;
  /** 報酬の倍率（塔・毎日の挑戦） */
  rewardScale?: number;
  /** 宝箱の品の強さ（ステージ相当） */
  tier?: number;
}

/** 合戦の決まりの変化（塔の恩恵・毎日の挑戦の条件） */
export interface BattleMods {
  atkMul?: number;
  critAdd?: number;
  rangeAdd?: number;
  spAdd?: number;
  coinMul?: number;
  noRest?: boolean;
  enemySpeedMul?: number;
}

export type ItemKind = 'weapon' | 'charm';
export type CharmStat = 'rest' | 'crit' | 'fly' | 'metal' | 'speed' | 'sp';

/** 装備品（持ち物） */
export interface Item {
  id: number;
  kind: ItemKind;
  /** 武器の系統 */
  line?: Line;
  /** 品質：1 並・2 良・3 極 */
  q: 1 | 2 | 3;
  name: string;
  /** 攻撃 +割合 */
  atk: number;
  crit: number;
  speed: number;
  range: number;
  rest: number;
  fly: number;
  metal: number;
  sp: number;
  price: number;
}

export type FacilityId = 'fence' | 'training' | 'smith' | 'market' | 'watch';

/** 塔の恩恵 */
export type BuffId = 'atk' | 'crit' | 'lives' | 'sp' | 'coin' | 'range' | 'heal';

export interface TowerRun {
  floor: number;
  buffs: BuffId[];
  villagers: number;
  maxVillagers: number;
  seed: number;
  /** 恩恵を選ぶ途中（3つの候補） */
  choosing: BuffId[] | null;
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
  /** 持ち物 */
  items: Item[];
  nextItemId: number;
  /** 店の品 */
  shop: Item[];
  /** 村の施設のレベル */
  village: Record<FacilityId, number>;
  /** 塔 */
  tower: { best: number; score: number; runs: number; run: TowerRun | null };
  /** 毎日の挑戦 */
  daily: { date: string; cleared: boolean; best: number };
  /** 見た案内 */
  tips: string[];
}

export interface Settings { bgm: number; se: number; speed: 1 | 2 | 3; numbers: boolean; autoSkill: boolean; effects: 'standard' | 'reduced' }
export const DEFAULT_SETTINGS: Settings = { bgm: 0.5, se: 0.7, speed: 1, numbers: true, autoSkill: false, effects: 'standard' };
