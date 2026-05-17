import type { CSSProperties } from 'react';
import { unitClasses } from '../data/classes';
import type { UnitState } from '../types/game';

interface UnitCardProps {
  unit: UnitState;
  selected?: boolean;
  compact?: boolean;
  onClick?: () => void;
}

export function UnitCard({ unit, selected = false, compact = false, onClick }: UnitCardProps) {
  const unitClass = unitClasses[unit.classId];
  const hpRate = Math.max(0, Math.min(100, (unit.hp / unit.maxHp) * 100));

  return (
    <button className={`unit-card ${selected ? 'selected' : ''} ${compact ? 'compact' : ''}`} onClick={onClick}>
      <div className="unit-portrait" style={{ '--unit-color': unitClass.color } as CSSProperties}>
        <span>{unitClass.icon}</span>
      </div>
      <div className="unit-card-info">
        <div className="unit-card-row">
          <strong>{unit.name}</strong>
          <span>Lv.{unit.level}</span>
        </div>
        <div className="unit-class-name">{unitClass.name}</div>
        <div className="mini-bar">
          <span style={{ width: `${hpRate}%` }} />
        </div>
        {!compact && <div className="unit-card-sub">HP {unit.hp}/{unit.maxHp}</div>}
      </div>
    </button>
  );
}
