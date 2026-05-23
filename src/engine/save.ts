import { createInitialPlayerState } from './progression';
import type { PlayerState, SaveData, SaveUnitState, SettingsState, UnitState } from '../types/game';
import { unitClasses } from '../data/classes';

export const SAVE_KEY = 'eight-wardens-save-v1';
export const SETTINGS_KEY = 'eight-wardens-settings-v1';

export function toSaveUnit(unit: UnitState): SaveUnitState {
  return {
    id: unit.id,
    name: unit.name,
    classId: unit.classId,
    level: unit.level,
    exp: unit.exp,
    hp: unit.hp,
    maxHp: unit.maxHp,
    isResting: unit.isResting,
    restGauge: unit.restGauge,
  };
}

export function saveGame(state: PlayerState): void {
  const saveData: SaveData = {
    gold: state.gold,
    villageHp: state.villageHp,
    maxVillageHp: state.maxVillageHp,
    currentStage: state.currentStage,
    clearedStages: state.clearedStages,
    units: state.units.map(toSaveUnit),
  };

  localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));
}

export function loadGame(): PlayerState | null {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const data = JSON.parse(raw) as SaveData;
    return hydrateSave(data);
  } catch {
    return null;
  }
}

export function clearSave(): void {
  localStorage.removeItem(SAVE_KEY);
}

export function hasSave(): boolean {
  return localStorage.getItem(SAVE_KEY) !== null;
}

export function hydrateSave(data: SaveData): PlayerState {
  const initial = createInitialPlayerState();
  const unitsById = new Map(data.units.map((unit) => [unit.id, unit]));
  const unitsByName = new Map(data.units.map((unit) => [unit.name, unit]));

  return {
    gold: data.gold,
    villageHp: data.villageHp,
    maxVillageHp: data.maxVillageHp,
    currentStage: data.currentStage,
    clearedStages: data.clearedStages,
    units: initial.units.map((unit) => {
      const saved = findSavedUnit(unit, unitsById, unitsByName);
      if (!saved) {
        return unit;
      }

      return {
        ...unit,
        ...saved,
        id: unit.id,
        name: unit.name,
        classId: normalizeClassIdForUnit(unit.id, saved.classId),
        attackCooldown: 0,
        slot: unit.slot,
      };
    }),
  };
}

function findSavedUnit(
  unit: UnitState,
  unitsById: Map<string, SaveUnitState>,
  unitsByName: Map<string, SaveUnitState>,
): SaveUnitState | undefined {
  const legacyIdAliases: Record<string, string[]> = {
    'unit-1': ['unit-1'],
    'unit-2': ['unit-2'],
    'unit-3': ['unit-3'],
    'unit-4': ['unit-8'],
    'unit-5': ['unit-4'],
    'unit-6': ['unit-5'],
    'unit-7': ['unit-7'],
  };

  for (const id of legacyIdAliases[unit.id] ?? [unit.id]) {
    const saved = unitsById.get(id);
    if (saved) {
      return saved;
    }
  }

  return unitsByName.get(unit.name);
}

function normalizeClassIdForUnit(unitId: string, classId: string): string {
  const legacyTier: Record<string, 'lower' | 'middle' | 'advanced'> = {
    scout: 'lower',
    artillerist: 'lower',
    ranger: 'middle',
    gunner: 'middle',
    trapper: 'middle',
    darkKnight: 'advanced',
    windArcher: 'advanced',
    binder: 'advanced',
    saint: 'advanced',
  };
  const tier = unitClasses[classId]?.tier ?? legacyTier[classId] ?? 'lower';
  const byTier: Record<string, Record<string, string>> = {
    'unit-1': { lower: 'swordsman', middle: 'kensai', advanced: 'swordmaster' },
    'unit-2': { lower: 'archer', middle: 'sniper', advanced: 'forestArcher' },
    'unit-3': { lower: 'shieldSoldier', middle: 'heavyKnight', advanced: 'holyShieldKnight' },
    'unit-4': { lower: 'priest', middle: 'cleric', advanced: 'saintess' },
    'unit-5': { lower: 'ninja', middle: 'shadowNinja', advanced: 'assassin' },
    'unit-6': { lower: 'hexBreaker', middle: 'mage', advanced: 'archmage' },
    'unit-7': { lower: 'lancer', middle: 'lanceKnight', advanced: 'lanceSaint' },
  };

  if (byTier[unitId]?.[tier]) {
    return byTier[unitId][tier];
  }

  return byTier[unitId]?.lower ?? classId;
}

export function saveSettings(settings: SettingsState): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function loadSettings(): SettingsState {
  const raw = localStorage.getItem(SETTINGS_KEY);
  if (!raw) {
    return { bgm: true, se: true };
  }

  try {
    const parsed = JSON.parse(raw) as SettingsState;
    return {
      bgm: Boolean(parsed.bgm),
      se: Boolean(parsed.se),
    };
  } catch {
    return { bgm: true, se: true };
  }
}
