import { bannerArt, stageBackgrounds, uiArt } from '../data/artAssets';
import { unitClasses } from '../data/classes';
import type { BattleResult, PlayerState } from '../types/game';
import { WardenSprite } from './AssetSprite';

interface ResultModalProps {
  result: BattleResult;
  onNextWave?: () => void;
  onBackToMap: () => void;
  onRetry?: () => void;
  playerState: PlayerState;
}

function formatTime(totalSec = 0) {
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function ResultModal({ result, onNextWave, onBackToMap, onRetry, playerState }: ResultModalProps) {
  if (result.type !== 'victory') {
    return (
      <div className="modal-backdrop">
        <div className="result-modal">
          <h2>{result.title}</h2>
          <p>{result.message}</p>
          <div className="modal-actions">
            {result.type === 'waveClear' && onNextWave && (
              <button className="action-button red" onClick={onNextWave}>
                次のWave
              </button>
            )}
            <button className="action-button blue" onClick={onBackToMap}>
              マップへ
            </button>
          </div>
        </div>
      </div>
    );
  }

  const participantIds = result.participants ?? playerState.units.map((unit) => unit.id);
  const participants = playerState.units.filter((unit) => participantIds.includes(unit.id));

  return (
    <div className="modal-backdrop stage-clear-backdrop">
      <section className="stage-clear-screen" style={{ backgroundImage: `url("${stageBackgrounds.result}")` }}>
        <img className="stage-clear-flourish" src={bannerArt.victoryFlourish} alt="" />
        <img className="stage-clear-banner" src={bannerArt.stageClear} alt="STAGE CLEAR" />
        <img className="stage-clear-stars" src={bannerArt.threeStar} alt="三つ星クリア" />

        <div className="stage-clear-summary">
          <div>
            <span>ステージ</span>
            <strong>{result.stageId ?? '-'}</strong>
          </div>
          <div>
            <span>クリアタイム</span>
            <strong>{formatTime(result.clearTimeSec)}</strong>
          </div>
          <div>
            <span>残り村耐久</span>
            <strong>{result.villageHp ?? playerState.villageHp}</strong>
          </div>
          <div>
            <span>撃破数</span>
            <strong>{result.kills ?? 0}</strong>
          </div>
        </div>

        <div className="stage-clear-rewards">
          <div><img src={uiArt.icons.coin} alt="" />獲得Gold <strong>{(result.goldEarned ?? 0).toLocaleString('ja-JP')}</strong></div>
          <div><img src={uiArt.icons.gem} alt="" />獲得宝石 <strong>{Math.max(1, result.stageId ?? 1)}</strong></div>
          <div><img src={bannerArt.rewardSparkle} alt="" />獲得EXP <strong>{(result.expEarned ?? 0).toLocaleString('ja-JP')}</strong></div>
        </div>

        <div className="stage-clear-party">
          {participants.map((unit) => (
            <div className="stage-clear-unit" key={unit.id}>
              <WardenSprite classId={unit.classId} unitId={unit.id} variant="face" />
              <span>{unit.name}</span>
              <small>{unitClasses[unit.classId].name} Lv.{unit.level}</small>
            </div>
          ))}
        </div>

        <div className="stage-clear-actions">
          <button className="action-button red" onClick={onBackToMap}>
            次へ
          </button>
          {onRetry && (
            <button className="action-button brown" onClick={onRetry}>
              再挑戦
            </button>
          )}
          <button className="action-button blue" onClick={onBackToMap}>
            マップへ戻る
          </button>
        </div>
      </section>
    </div>
  );
}
