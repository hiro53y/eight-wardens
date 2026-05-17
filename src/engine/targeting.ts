import { unitClasses } from '../data/classes';
import type { BattleEnemy, UnitState } from '../types/game';

export const BATTLE_WIDTH = 1280;
export const BATTLE_HEIGHT = 430;
export const PATH_Y = 150;
export const VILLAGE_GATE_X = 1128;

export interface Point {
  x: number;
  y: number;
}

const UNIT_POSITIONS: Point[] = [
  { x: 250, y: 275 },
  { x: 430, y: 265 },
  { x: 610, y: 275 },
  { x: 790, y: 265 },
  { x: 250, y: 355 },
  { x: 430, y: 348 },
  { x: 610, y: 355 },
  { x: 790, y: 348 },
];

export function getUnitPosition(slot: number): Point {
  return UNIT_POSITIONS[slot] ?? UNIT_POSITIONS[0];
}

export function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function findTargetForUnit(unit: UnitState, enemies: BattleEnemy[]): BattleEnemy | null {
  const unitClass = unitClasses[unit.classId];
  const origin = getUnitPosition(unit.slot);
  const candidates = enemies.filter((enemy) => {
    if (enemy.hp <= 0) {
      return false;
    }
    return distance(origin, { x: enemy.x, y: enemy.y }) <= unitClass.range;
  });

  if (candidates.length === 0) {
    return null;
  }

  return candidates.reduce((rightMost, enemy) => (enemy.x > rightMost.x ? enemy : rightMost), candidates[0]);
}
