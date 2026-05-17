import { enemies } from '../data/enemies';
import { unitClasses } from '../data/classes';
import type { EnemyDefinition, UnitState } from '../types/game';
import {
  calculateAttack,
  calculateCooldown,
  getNextLevelRequirement,
  getPromotionCost,
} from './progression';

export interface LevelUpResult {
  unit: UnitState;
  success: boolean;
  message: string;
}

export interface PromotionResult {
  unit: UnitState;
  gold: number;
  success: boolean;
  message: string;
}

export function calculateDamage(unit: UnitState, enemy: EnemyDefinition): number {
  const unitClass = unitClasses[unit.classId];
  const attack = calculateAttack(unit, unitClass);

  if (enemy.type === 'metal') {
    return unitClass.metalFixedDamage ?? 1;
  }

  if (enemy.type === 'fly') {
    return Math.max(1, Math.round(attack * unitClass.flyDamageRate));
  }

  return attack;
}

export function getKillGold(unit: UnitState, enemyId: string): { gold: number; multiplier: number } {
  const unitClass = unitClasses[unit.classId];
  const enemy = enemies[enemyId];
  const multiplier = unitClass.goldMultiplierOnKill ?? 1;

  return {
    gold: enemy.gold * multiplier,
    multiplier,
  };
}

export function tryLevelUp(unit: UnitState): LevelUpResult {
  const requiredExp = getNextLevelRequirement(unit.level);
  if (requiredExp === null) {
    return {
      unit,
      success: false,
      message: 'Lvは上限です',
    };
  }

  if (unit.exp < requiredExp) {
    return {
      unit,
      success: false,
      message: `EXPが不足しています（必要 ${requiredExp}）`,
    };
  }

  return {
    unit: {
      ...unit,
      level: unit.level + 1,
      exp: unit.exp - requiredExp,
      attackCooldown: 0,
    },
    success: true,
    message: `${unit.name} が Lv${unit.level + 1} になりました`,
  };
}

export function promoteUnit(unit: UnitState, targetClassId: string, currentGold: number): PromotionResult {
  const currentClass = unitClasses[unit.classId];
  const targetClass = unitClasses[targetClassId];
  const cost = getPromotionCost(currentClass);

  if (!targetClass || !currentClass.promotionTargets.includes(targetClassId)) {
    return {
      unit,
      gold: currentGold,
      success: false,
      message: 'この職業には転職できません',
    };
  }

  if (cost === null) {
    return {
      unit,
      gold: currentGold,
      success: false,
      message: 'これ以上の転職先はありません',
    };
  }

  if (currentGold < cost) {
    return {
      unit,
      gold: currentGold,
      success: false,
      message: `Goldが不足しています（必要 ${cost}）`,
    };
  }

  return {
    unit: {
      ...unit,
      classId: targetClassId,
      restGauge: 0,
      attackCooldown: 0,
    },
    gold: currentGold - cost,
    success: true,
    message: `${unit.name} は ${targetClass.name} に転職しました`,
  };
}

export function resetCooldown(unit: UnitState): UnitState {
  return {
    ...unit,
    attackCooldown: calculateCooldown(unit),
  };
}
