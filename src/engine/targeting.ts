import { unitClasses } from '../data/classes';
import type { BattleEnemy, UnitState } from '../types/game';

export const BATTLE_WIDTH = 1280;
export const BATTLE_HEIGHT = 470;
export const PATH_Y = 214;
export const VILLAGE_GATE_X = 1128;

export interface Point {
  x: number;
  y: number;
}

const UNIT_POSITIONS: Point[] = [
  { x: 245, y: 128 },
  { x: 430, y: 116 },
  { x: 615, y: 128 },
  { x: 800, y: 116 },
  { x: 310, y: 336 },
  { x: 525, y: 348 },
  { x: 740, y: 336 },
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
