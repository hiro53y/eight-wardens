import { useEffect, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { unitClasses } from '../data/classes';
import { beginNextWave, updateBattleState } from '../engine/gameLoop';
import { playDamageSe } from '../engine/audio';
import { markStageCleared } from '../engine/progression';
import { promoteUnit, tryLevelUp } from '../engine/combat';
import type { BattleState, PlayerState } from '../types/game';
import { GameCanvas } from './GameCanvas';
import { ResultModal } from './ResultModal';
import { TopHud } from './TopHud';
import { UnitDetailPanel } from './UnitDetailPanel';

interface BattleScreenProps {
  playerState: PlayerState;
  setPlayerState: Dispatch<SetStateAction<PlayerState>>;
  battleState: BattleState;
  setBattleState: Dispatch<SetStateAction<BattleState | null>>;
  onBackToMap: () => void;
  onOpenSettings: () => void;
  onToast: (message: string) => void;
  seEnabled: boolean;
}

export function BattleScreen({
  playerState,
  setPlayerState,
  battleState,
  setBattleState,
  onBackToMap,
  onOpenSettings,
  onToast,
  seEnabled,
}: BattleScreenProps) {
  const playerRef = useRef(playerState);
  const seenHitEffectsRef = useRef(new Set<string>());
  const [promotionOpen, setPromotionOpen] = useState(false);

  useEffect(() => {
    playerRef.current = playerState;
  }, [playerState]);

  useEffect(() => {
    const newHit = battleState.effects.some((effect) => {
      if (effect.type !== 'hit' || seenHitEffectsRef.current.has(effect.id)) {
        return false;
      }
      seenHitEffectsRef.current.add(effect.id);
      return true;
    });
    if (newHit) {
      playDamageSe(seEnabled);
    }
  }, [battleState.effects, seEnabled]);

  useEffect(() => {
    let frameId = 0;
    let lastTime = performance.now();

    const tick = (time: number) => {
      const dt = (time - lastTime) / 1000;
      lastTime = time;

      setBattleState((current) => {
        if (!current) {
          return current;
        }
        const result = updateBattleState(current, playerRef.current, dt);
        playerRef.current = result.player;
        setPlayerState(result.player);
        return result.battle;
      });

      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [setBattleState, setPlayerState]);

  const selectedUnit =
    playerState.units.find((unit) => unit.id === battleState.selectedUnitId) ?? playerState.units[0];
  const selectedClass = unitClasses[selectedUnit.classId];
  const promotionTargets = selectedClass.promotionTargets;

  const updatePlayer = (updater: (current: PlayerState) => PlayerState) => {
    setPlayerState((current) => {
      const next = updater(current);
      playerRef.current = next;
      return next;
    });
  };

  const setBattleMessage = (message: string) => {
    setBattleState((current) => (current ? { ...current, message } : current));
  };

  const handleAttack = () => {
    updatePlayer((current) => ({
      ...current,
      units: current.units.map((unit) => (unit.id === selectedUnit.id ? { ...unit, isResting: false } : unit)),
    }));
    setBattleMessage(`${selectedUnit.name} は攻撃に戻りました`);
  };

  const handleRest = () => {
    updatePlayer((current) => ({
      ...current,
      units: current.units.map((unit) => (unit.id === selectedUnit.id ? { ...unit, isResting: true } : unit)),
    }));
    setBattleMessage(`${selectedUnit.name} は休憩を始めました`);
  };

  const handleLevelUp = () => {
    const result = tryLevelUp(selectedUnit);
    updatePlayer((current) => ({
      ...current,
      units: current.units.map((unit) => (unit.id === selectedUnit.id ? result.unit : unit)),
    }));
    onToast(result.message);
    setBattleMessage(result.message);
  };

  const handlePromote = (targetClassId: string) => {
    const result = promoteUnit(selectedUnit, targetClassId, playerRef.current.gold);
    updatePlayer((current) => ({
      ...current,
      gold: result.gold,
      units: current.units.map((unit) => (unit.id === selectedUnit.id ? result.unit : unit)),
    }));
    onToast(result.message);
    setBattleMessage(result.message);
    if (result.success) {
      setPromotionOpen(false);
    }
  };

  const handleResultBack = () => {
    if (battleState.result?.type === 'victory') {
      updatePlayer((current) => markStageCleared(current, battleState.stageId));
    }
    if (battleState.result?.type === 'gameOver') {
      updatePlayer((current) => ({ ...current, villageHp: current.maxVillageHp }));
    }
    setBattleState(null);
    onBackToMap();
  };

  return (
    <section className="screen battle-screen">
      <TopHud
        battleState={battleState}
        playerState={playerState}
        onTogglePause={() => setBattleState((current) => (current ? { ...current, isPaused: !current.isPaused } : current))}
        onSpeedChange={(speed) => setBattleState((current) => (current ? { ...current, speedMultiplier: speed } : current))}
        onOpenSettings={onOpenSettings}
      />
      <div className="battle-message">{battleState.message}</div>
      <GameCanvas
        battleState={battleState}
        playerState={playerState}
        onSelectUnit={(unitId) => setBattleState((current) => (current ? { ...current, selectedUnitId: unitId } : current))}
      />
      <UnitDetailPanel
        unit={selectedUnit}
        gold={playerState.gold}
        onAttack={handleAttack}
        onRest={handleRest}
        onLevelUp={handleLevelUp}
        onPromote={() => setPromotionOpen(true)}
      />

      {promotionOpen && (
        <div className="modal-backdrop">
          <div className="promotion-modal">
            <h2>転職先を選択</h2>
            <p>{selectedUnit.name} / 現在: {selectedClass.name}</p>
            <div className="promotion-options">
              {promotionTargets.length === 0 ? (
                <div className="empty-note">これ以上の転職先はありません</div>
              ) : (
                promotionTargets.map((classId) => {
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

      {battleState.result && (
        <ResultModal
          result={battleState.result}
          onNextWave={
            battleState.result.type === 'waveClear'
              ? () => setBattleState((current) => (current ? beginNextWave(current) : current))
              : undefined
          }
          onBackToMap={handleResultBack}
        />
      )}
    </section>
  );
}
