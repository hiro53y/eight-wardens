import { createInitialPlayerState } from './progression';
import type { PlayerState, SaveData, SaveUnitState, SettingsState, UnitState } from '../types/game';

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

  return {
    gold: data.gold,
    villageHp: data.villageHp,
    maxVillageHp: data.maxVillageHp,
    currentStage: data.currentStage,
    clearedStages: data.clearedStages,
    units: initial.units.map((unit) => {
      const saved = unitsById.get(unit.id);
      if (!saved) {
        return unit;
      }

      return {
        ...unit,
        ...saved,
        attackCooldown: 0,
        slot: unit.slot,
      };
    }),
  };
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
