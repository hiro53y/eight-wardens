import type { CSSProperties } from 'react';
import { unitClasses } from '../data/classes';
import type { UnitState } from '../types/game';
import { calculateAttack, calculateCooldown, formatRangeAsSquares, getNextLevelRequirement } from '../engine/progression';

interface UnitDetailPanelProps {
  unit: UnitState;
  gold: number;
  onAttack: () => void;
  onRest: () => void;
  onLevelUp: () => void;
  onPromote: () => void;
}

export function UnitDetailPanel({ unit, gold, onAttack, onRest, onLevelUp, onPromote }: UnitDetailPanelProps) {
  const unitClass = unitClasses[unit.classId];
  const nextExp = getNextLevelRequirement(unit.level);
  const expRate = nextExp ? Math.max(0, Math.min(100, (unit.exp / nextExp) * 100)) : 100;
  const restRate = Math.max(0, Math.min(100, unit.restGauge));
  const portraitX = `${(unit.slot % 4) * 33.3333}%`;
  const portraitY = unit.slot < 4 ? '0%' : '100%';

  return (
    <aside className="unit-detail-panel">
      <div
        className="detail-portrait generated-portrait"
        style={{ '--unit-color': unitClass.color, '--portrait-x': portraitX, '--portrait-y': portraitY } as CSSProperties}
      >
        <span>{unitClass.icon}</span>
        <i />
      </div>
      <div className="detail-main">
        <div className="detail-title-row">
          <div>
            <div className="detail-class">{unitClass.name}</div>
            <div className="detail-name">{unit.name}</div>
          </div>
          <div className="detail-level">Lv.{unit.level}</div>
        </div>
        <div className="gauge-line">
          <span>HP</span>
          <div className="wide-bar hp">
            <i style={{ width: `${(unit.hp / unit.maxHp) * 100}%` }} />
          </div>
          <em>{unit.hp}/{unit.maxHp}</em>
        </div>
        <div className="gauge-line">
          <span>EXP</span>
          <div className="wide-bar exp">
            <i style={{ width: `${expRate}%` }} />
          </div>
          <em>{nextExp ? `${unit.exp}/${nextExp}` : 'MAX'}</em>
        </div>
        <div className="gauge-line">
          <span>休憩</span>
          <div className="wide-bar rest">
            <i style={{ width: `${restRate}%` }} />
          </div>
          <em>{unit.isResting ? '休憩中' : '攻撃中'}</em>
        </div>
      </div>
      <div className="detail-stats">
        <div>攻撃力 <strong>{calculateAttack(unit, unitClass)}</strong></div>
        <div>攻撃間隔 <strong>{calculateCooldown(unit, unitClass).toFixed(2)}秒</strong></div>
        <div>射程 <strong>{formatRangeAsSquares(unitClass.range)}</strong></div>
        <div>所持Gold <strong>{gold.toLocaleString('ja-JP')}</strong></div>
        <div className="range-preview" aria-label="射程範囲図">
          {Array.from({ length: 25 }, (_, index) => (
            <span key={index} className={index === 12 ? 'core' : [7, 11, 13, 17, 6, 8, 16, 18].includes(index) ? 'range' : ''} />
          ))}
        </div>
      </div>
      <div className="battle-actions">
        <button className="action-button red" onClick={onAttack}>
          攻撃
        </button>
        <button className="action-button green" onClick={onRest}>
          休憩
        </button>
        <button className="action-button blue" onClick={onLevelUp}>
          LvUp
        </button>
        <button className="action-button purple" onClick={onPromote}>
          転職
        </button>
      </div>
    </aside>
  );
}
