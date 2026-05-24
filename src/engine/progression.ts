import { initialUnits } from '../data/initialUnits';
import { unitClasses } from '../data/classes';
import type { PlayerState, UnitClass, UnitState } from '../types/game';

export const MAX_LEVEL = 3;
export const EXP_REQUIREMENTS: Record<number, number> = {
  1: 30,
  2: 100,
  3: 250,
};

export function createInitialPlayerState(): PlayerState {
  return {
    gold: 120,
    villageHp: 10,
    maxVillageHp: 10,
    currentStage: 0,
    clearedStages: [],
    units: initialUnits.map((unit) => ({ ...unit })),
  };
}

export function getNextLevelRequirement(level: number): number | null {
  if (level >= MAX_LEVEL) {
    return null;
  }
  return EXP_REQUIREMENTS[level + 1] ?? null;
}

export function calculateAttack(unit: UnitState, unitClass: UnitClass = unitClasses[unit.classId]): number {
  return Math.max(1, Math.round(unitClass.baseAttack * (1 + unit.level * 0.35)));
}

export function calculateCooldown(unit: UnitState, unitClass: UnitClass = unitClasses[unit.classId]): number {
  return Number((unitClass.baseCooldown * 0.9 ** unit.level).toFixed(2));
}

export function formatRangeAsSquares(range: number): string {
  return `${(range / 80).toFixed(1)}マス`;
}

export function getPromotionCost(unitClass: UnitClass): number | null {
  if (unitClass.tier === 'lower') {
    return 100;
  }
  if (unitClass.tier === 'middle') {
    return 800;
  }
  return null;
}

export function isStageUnlocked(stageId: number, player: PlayerState): boolean {
  if (stageId === 0) {
    return true;
  }
  return stageId <= Math.min(10, player.currentStage + 1);
}

export function markStageCleared(player: PlayerState, stageId: number): PlayerState {
  if (stageId === 0) {
    return {
      ...player,
      villageHp: player.maxVillageHp,
    };
  }

  const clearedStages = player.clearedStages.includes(stageId)
    ? player.clearedStages
    : [...player.clearedStages, stageId].sort((a, b) => a - b);

  return {
    ...player,
    currentStage: Math.max(player.currentStage, stageId),
    clearedStages,
    villageHp: player.maxVillageHp,
  };
}
