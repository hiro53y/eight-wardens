import type { BattleState, PlayerState } from '../types/game';
import { waves } from '../data/waves';

interface TopHudProps {
  battleState: BattleState;
  playerState: PlayerState;
  onTogglePause: () => void;
  onSpeedChange: (speed: 1 | 2 | 3) => void;
  onOpenSettings: () => void;
}

export function TopHud({ battleState, playerState, onTogglePause, onSpeedChange, onOpenSettings }: TopHudProps) {
  return (
    <header className="top-hud">
      <div className="hud-stat">剣 WAVE {battleState.waveIndex + 1}/{waves.length}</div>
      <div className="hud-stat">金 GOLD {playerState.gold.toLocaleString('ja-JP')}</div>
      <div className="hud-stat">砦 村耐久 {playerState.villageHp}/{playerState.maxVillageHp}</div>
      <div className="hud-spacer" />
      <button className="hud-square" onClick={onTogglePause}>
        {battleState.isPaused ? '再開' : '停止'}
      </button>
      {[1, 2, 3].map((speed) => (
        <button
          key={speed}
          className={`hud-speed ${battleState.speedMultiplier === speed ? 'active' : ''}`}
          onClick={() => onSpeedChange(speed as 1 | 2 | 3)}
        >
          {speed}x
        </button>
      ))}
      <button className="hud-square" onClick={onOpenSettings}>
        歯
      </button>
    </header>
  );
}
