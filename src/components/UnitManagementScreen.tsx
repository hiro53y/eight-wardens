import { useState } from 'react';
import type { CSSProperties, Dispatch, SetStateAction } from 'react';
import { unitClasses } from '../data/classes';
import { promoteUnit } from '../engine/combat';
import { calculateAttack, calculateCooldown, formatRangeAsSquares, getNextLevelRequirement, getPromotionCost } from '../engine/progression';
import type { PlayerState } from '../types/game';
import { WardenSprite } from './AssetSprite';
import { UnitCard } from './UnitCard';

interface UnitManagementScreenProps {
  playerState: PlayerState;
  setPlayerState: Dispatch<SetStateAction<PlayerState>>;
  onBack: () => void;
  onToast: (message: string) => void;
}

export function UnitManagementScreen({ playerState, setPlayerState, onBack, onToast }: UnitManagementScreenProps) {
  const [selectedUnitId, setSelectedUnitId] = useState(playerState.units[0].id);
  const [promotionOpen, setPromotionOpen] = useState(false);
  const selectedUnit = playerState.units.find((unit) => unit.id === selectedUnitId) ?? playerState.units[0];
  const selectedClass = unitClasses[selectedUnit.classId];
  const nextExp = getNextLevelRequirement(selectedUnit.level);
  const promotionCost = getPromotionCost(selectedClass);

  const handlePromote = (targetClassId: string) => {
    const result = promoteUnit(selectedUnit, targetClassId, playerState.gold);
    setPlayerState((current) => ({
      ...current,
      gold: result.gold,
      units: current.units.map((unit) => (unit.id === selectedUnit.id ? result.unit : unit)),
    }));
    onToast(result.message);
    if (result.success) {
      setPromotionOpen(false);
    }
  };

  const moveSelectedToFront = () => {
    setPlayerState((current) => {
      const sorted = [...current.units].sort((a, b) => a.slot - b.slot);
      const targetIndex = sorted.findIndex((unit) => unit.id === selectedUnit.id);
      if (targetIndex <= 0) {
        const rotated = sorted.map((unit, index) => ({ ...unit, slot: (index + 1) % sorted.length }));
        return { ...current, units: rotated };
      }
      const reordered = [sorted[targetIndex], ...sorted.slice(0, targetIndex), ...sorted.slice(targetIndex + 1)];
      return { ...current, units: reordered.map((unit, slot) => ({ ...unit, slot })) };
    });
    onToast('編成位置を更新しました');
  };

  const reinforceEquipment = () => {
    const cost = 30;
    if (playerState.gold < cost) {
      onToast(`装備強化にはGold ${cost}が必要です`);
      return;
    }
    setPlayerState((current) => ({
      ...current,
      gold: current.gold - cost,
      units: current.units.map((unit) =>
        unit.id === selectedUnit.id
          ? { ...unit, maxHp: unit.maxHp + 10, hp: Math.min(unit.maxHp + 10, unit.hp + 35) }
          : unit,
      ),
    }));
    onToast(`${selectedUnit.name}の装備を強化しました`);
  };

  const toggleResting = () => {
    setPlayerState((current) => ({
      ...current,
      units: current.units.map((unit) => (unit.id === selectedUnit.id ? { ...unit, isResting: !unit.isResting } : unit)),
    }));
    onToast(`${selectedUnit.name}の休憩設定を切り替えました`);
  };

  return (
    <section className="screen unit-management-screen">
      <header className="management-header">
        <button className="nav-back icon-back" onClick={onBack}>
          戻る
        </button>
        <h1>ユニット管理</h1>
        <div className="header-stat">GOLD {playerState.gold.toLocaleString('ja-JP')}</div>
        <div className="header-stat">総戦力 {(playerState.units.length * 1570 + playerState.gold).toLocaleString('ja-JP')}</div>
        <button className="nav-back icon-home" onClick={onBack}>
          ホーム
        </button>
      </header>

      <div className="management-layout">
        <aside className="unit-list-panel">
          <div className="panel-title">防衛ユニット 8/8</div>
          <div className="unit-grid">
            {playerState.units.map((unit) => (
              <UnitCard
                key={unit.id}
                unit={unit}
                selected={unit.id === selectedUnit.id}
                onClick={() => setSelectedUnitId(unit.id)}
              />
            ))}
          </div>
        </aside>

        <main className="unit-profile-panel">
          <div className="profile-top">
            <div
              className="large-portrait"
              style={{ '--unit-color': selectedClass.color } as CSSProperties}
            >
              <WardenSprite classId={selectedUnit.classId} unitId={selectedUnit.id} variant="portrait" />
              <span className="portrait-shine" />
            </div>
            <div className="profile-stats">
              <h2>{selectedClass.name}</h2>
              <h3>{selectedUnit.name}</h3>
              <div className="star-row">{'★'.repeat(selectedUnit.level + 1)}{'☆'.repeat(4 - selectedUnit.level)}</div>
              <div>Lv.{selectedUnit.level} / 3</div>
              <div>EXP {nextExp ? `${selectedUnit.exp}/${nextExp}` : 'MAX'}</div>
              <div>HP {selectedUnit.hp}/{selectedUnit.maxHp}</div>
              <div>攻撃力 {calculateAttack(selectedUnit, selectedClass)}</div>
              <div>射程 {formatRangeAsSquares(selectedClass.range)}</div>
              <div>攻撃間隔 {calculateCooldown(selectedUnit, selectedClass).toFixed(2)}秒</div>
              <div>防御力 {Math.round(selectedUnit.maxHp / 8)}</div>
            </div>
          </div>

          <div className="class-tree-panel">
            <div className="panel-title">クラスタリー</div>
            <div className="class-tree">
              <div className="class-node current">{selectedClass.name}</div>
              <div className="tree-connector" />
              <div className="tree-branches">
                {selectedClass.promotionTargets.length === 0 ? (
                  <div className="class-node locked">最終職</div>
                ) : (
                  selectedClass.promotionTargets.map((classId) => {
                    const target = unitClasses[classId];
                    return (
                      <div className="class-node" key={classId}>
                        <strong>{target.name}</strong>
                        <WardenSprite classId={target.id} variant="battle" />
                      </div>
                    );
                  })
                )}
              </div>
            </div>
            <p>転職すると新しい役割を得て、ステータスが大きく変化します。</p>
            <p>必要Gold: {promotionCost === null ? 'なし' : promotionCost.toLocaleString('ja-JP')}</p>
          </div>
        </main>

        <aside className="formation-panel">
          <div className="panel-title">編成プレビュー</div>
          <div className="formation-field">
          <div className="formation-grid">
            {playerState.units.map((unit) => (
              <div className="formation-slot" key={unit.id} style={{ '--unit-color': unitClasses[unit.classId].color } as CSSProperties}>
                <WardenSprite classId={unit.classId} unitId={unit.id} variant="battle" />
              </div>
            ))}
          </div>
          </div>
          <button className="action-button blue" onClick={moveSelectedToFront}>
            編成
          </button>
          <button className="action-button brown" onClick={reinforceEquipment}>
            装備
          </button>
          <button className="action-button green" onClick={toggleResting}>
            休憩設定
          </button>
          <button className="action-button purple" onClick={() => setPromotionOpen(true)}>
            転職する
          </button>
        </aside>
      </div>

      {promotionOpen && (
        <div className="modal-backdrop">
          <div className="promotion-modal">
            <h2>転職する</h2>
            <p>{selectedUnit.name} / {selectedClass.name}</p>
            <div className="promotion-options">
              {selectedClass.promotionTargets.length === 0 ? (
                <div className="empty-note">これ以上の転職先はありません</div>
              ) : (
                selectedClass.promotionTargets.map((classId) => {
                  const target = unitClasses[classId];
                  return (
                    <button key={classId} className="promotion-option" onClick={() => handlePromote(classId)}>
                      <strong>{target.name}</strong>
                      <span>{target.role}</span>
                    </button>
                  );
                })
              )}
            </div>
            <button className="action-button gray" onClick={() => setPromotionOpen(false)}>
              閉じる
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
