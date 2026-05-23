import type { CSSProperties } from 'react';
import { enemyArtByEnemyId, getUnitArt, uiArt, type UnitArtVariant } from '../data/artAssets';

interface WardenSpriteProps {
  classId: string;
  unitId?: string;
  variant?: UnitArtVariant;
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

function imageStyle(url: string): CSSProperties {
  return {
    '--sprite-url': `url("${url}")`,
  } as CSSProperties;
}

export function WardenSprite({ classId, unitId, variant = 'battle', className = '' }: WardenSpriteProps) {
  const art = getUnitArt({ unitId, classId });
  return (
    <span
      className={`asset-sprite asset-image-sprite warden-sprite warden-${variant} ${className}`}
      style={imageStyle(art[variant])}
    />
  );
}

export function EnemySprite({ enemyId, className = '' }: EnemySpriteProps) {
  const url = enemyArtByEnemyId[enemyId] ?? enemyArtByEnemyId.grassSlime;
  return <span className={`asset-sprite asset-image-sprite enemy-sprite-art ${className}`} style={imageStyle(url)} />;
}

export function MarkerSprite({ type, className = '' }: MarkerSpriteProps) {
  const icon = type === 'locked' ? uiArt.icons.lock : type === 'cleared' ? uiArt.icons.starGold : type === 'danger' ? uiArt.icons.sword : uiArt.icons.shield;
  return <span className={`asset-sprite asset-image-sprite marker-sprite marker-${type} ${className}`} style={imageStyle(icon)} />;
}
