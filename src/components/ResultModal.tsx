import type { BattleResult } from '../types/game';

interface ResultModalProps {
  result: BattleResult;
  onNextWave?: () => void;
  onBackToMap: () => void;
}

export function ResultModal({ result, onNextWave, onBackToMap }: ResultModalProps) {
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
