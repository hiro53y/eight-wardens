import type { CSSProperties } from 'react';
import { classSpriteIndex, enemySheet, enemySpriteIndex, markerSheet, wardenSheet } from '../data/artAssets';

interface WardenSpriteProps {
  classId: string;
  className?: string;
}

interface EnemySpriteProps {
  enemyId: string;
  className?: string;
}

interface MarkerSpriteProps {
  type: 'stage' | 'cleared' | 'locked' | 'danger';
  className?: string;
}

function spriteStyle(url: string, columns: number, rows: number, index: number): CSSProperties {
  const column = index % columns;
  const row = Math.floor(index / columns);
  return {
    '--sprite-url': `url("${url}")`,
    '--sprite-x': columns === 1 ? '0%' : `${(column / (columns - 1)) * 100}%`,
    '--sprite-y': rows === 1 ? '0%' : `${(row / (rows - 1)) * 100}%`,
    '--sprite-size-x': `${columns * 100}%`,
    '--sprite-size-y': `${rows * 100}%`,
  } as CSSProperties;
}

export function WardenSprite({ classId, className = '' }: WardenSpriteProps) {
  const index = classSpriteIndex[classId] ?? 0;
  return <span className={`asset-sprite warden-sprite ${className}`} style={spriteStyle(wardenSheet.url, wardenSheet.columns, wardenSheet.rows, index)} />;
}

export function EnemySprite({ enemyId, className = '' }: EnemySpriteProps) {
  const index = enemySpriteIndex[enemyId] ?? 0;
  return <span className={`asset-sprite enemy-sprite-art ${className}`} style={spriteStyle(enemySheet.url, enemySheet.columns, enemySheet.rows, index)} />;
}

export function MarkerSprite({ type, className = '' }: MarkerSpriteProps) {
  const index = { stage: 0, cleared: 1, locked: 2, danger: 3 }[type];
  return <span className={`asset-sprite marker-sprite ${className}`} style={spriteStyle(markerSheet.url, markerSheet.columns, markerSheet.rows, index)} />;
}
