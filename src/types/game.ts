export type Screen =
  | 'title'
  | 'stageSelect'
  | 'battle'
  | 'unitManagement'
  | 'encyclopedia'
  | 'settings';

export type EnemyType = 'normal' | 'fly' | 'rapid' | 'metal' | 'boss' | 'finalBoss';
export type ClassTier = 'lower' | 'middle' | 'advanced';
export type BattleResultType = 'waveClear' | 'victory' | 'gameOver';

export interface UnitClass {
  id: string;
  name: string;
  tier: ClassTier;
  baseAttack: number;
  baseCooldown: number;
  range: number;
  flyDamageRate: number;
  metalFixedDamage?: number;
  goldMultiplierOnKill?: number;
  slowSeconds?: number;
  promotionTargets: string[];
  role: string;
  icon: string;
  color: string;
}

export interface EnemyDefinition {
  id: string;
  name: string;
  type: EnemyType;
  hp: number;
  speed: number;
  gold: number;
  exp: number;
  villageDamage: number;
  color: string;
}

export interface WaveEntry {
  enemyId: string;
  count: number;
}

export interface WaveDefinition {
  id: number;
  title: string;
  entries: WaveEntry[];
  spawnInterval: number;
  restExp: number;
  isBoss?: boolean;
}

export interface UnitState {
  id: string;
  name: string;
  classId: string;
  level: number;
  exp: number;
  hp: number;
  maxHp: number;
  isResting: boolean;
  restGauge: number;
  attackCooldown: number;
  slot: number;
}

export interface SaveUnitState {
  id: string;
  name: string;
  classId: string;
  level: number;
  exp: number;
  hp: number;
  maxHp: number;
  isResting: boolean;
  restGauge: number;
}

export interface PlayerState {
  gold: number;
  villageHp: number;
  maxVillageHp: number;
  currentStage: number;
  clearedStages: number[];
  units: UnitState[];
}

export interface BattleEnemy {
  instanceId: string;
  enemyId: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  speed: number;
  laneOffset: number;
  slowTimer: number;
}

export interface Projectile {
  id: string;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  age: number;
  duration: number;
  color: string;
  kind?: 'slash' | 'arrow' | 'cannon' | 'magic';
}

export interface Effect {
  id: string;
  type: 'hit' | 'defeat' | 'gold' | 'message';
  x: number;
  y: number;
  age: number;
  duration: number;
  text?: string;
  color?: string;
}

export interface BattleResult {
  type: BattleResultType;
  title: string;
  message: string;
}

export interface BattleState {
  stageId: number;
  waveIndex: number;
  enemies: BattleEnemy[];
  projectiles: Projectile[];
  effects: Effect[];
  isPaused: boolean;
  speedMultiplier: 1 | 2 | 3;
  selectedUnitId: string;
  result: BattleResult | null;
  spawnTimer: number;
  spawnedEntries: Record<number, number>;
  message: string;
}

export interface SettingsState {
  bgm: boolean;
  se: boolean;
}

export interface SaveData {
  gold: number;
  villageHp: number;
  maxVillageHp: number;
  currentStage: number;
  clearedStages: number[];
  units: SaveUnitState[];
}
