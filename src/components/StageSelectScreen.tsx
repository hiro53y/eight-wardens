import { enemies } from '../data/enemies';
import { waves } from '../data/waves';
import { isStageUnlocked } from '../engine/progression';
import type { PlayerState } from '../types/game';

interface StageSelectScreenProps {
  playerState: PlayerState;
  selectedStage: number;
  onSelectStage: (stageId: number) => void;
  onDeploy: (stageId: number) => void;
  onBack: () => void;
  onOpenUnits: () => void;
  onOpenEncyclopedia: () => void;
  onOpenSettings: () => void;
  onToast: (message: string) => void;
}

const stageNodes = [
  { id: 1, name: '村落の入口', x: 15, y: 78 },
  { id: 2, name: '川辺の橋', x: 26, y: 62 },
  { id: 3, name: '緑風の丘', x: 18, y: 42 },
  { id: 4, name: '南の湿地', x: 36, y: 78 },
  { id: 5, name: '古い見張台', x: 42, y: 55 },
  { id: 6, name: '山あいの門', x: 43, y: 30 },
  { id: 7, name: '渓谷の要塞', x: 55, y: 48 },
  { id: 8, name: '黒森の入口', x: 65, y: 70 },
  { id: 9, name: '結晶洞窟', x: 64, y: 26 },
  { id: 10, name: '毒の城塞', x: 76, y: 30 },
];

export function StageSelectScreen({
  playerState,
  selectedStage,
  onSelectStage,
  onDeploy,
  onBack,
  onOpenUnits,
  onOpenEncyclopedia,
  onOpenSettings,
  onToast,
}: StageSelectScreenProps) {
  const selectedNode = stageNodes.find((node) => node.id === selectedStage) ?? stageNodes[0];
  const unlocked = isStageUnlocked(selectedNode.id, playerState);
  const cleared = playerState.clearedStages.includes(selectedNode.id);
  const enemyTypes = Array.from(new Set(waves.flatMap((wave) => wave.entries.map((entry) => enemies[entry.enemyId].type))));

  const handleNodeClick = (stageId: number) => {
    if (!isStageUnlocked(stageId, playerState)) {
      onToast('このステージはまだロックされています');
      return;
    }
    onSelectStage(stageId);
  };

  return (
    <section className="screen stage-screen">
      <header className="map-header">
        <button className="nav-back" onClick={onBack}>
          戻る
        </button>
        <div className="map-title">冒険</div>
        <button className="tab active">マップ</button>
        <button className="tab" onClick={onOpenUnits}>
          部隊
        </button>
        <button className="tab" onClick={onOpenEncyclopedia}>
          図鑑
        </button>
        <button className="tab" onClick={() => onToast('実績は今後追加予定です')}>
          実績
        </button>
        <div className="header-stat">GOLD {playerState.gold.toLocaleString('ja-JP')}</div>
        <div className="header-stat">村耐久 {playerState.villageHp}/{playerState.maxVillageHp}</div>
        <button className="nav-back" onClick={onOpenSettings}>
          設定
        </button>
      </header>

      <div className="map-layout">
        <div className="world-map">
          <div className="chapter-banner">
            <span>第1章</span>
            <strong>緑風の平原</strong>
          </div>
          <div className="map-river" />
          <div className="dark-region" />
          <div className="route-line route-a" />
          <div className="route-line route-b" />
          <div className="route-line route-c" />
          <div className="map-village">村落</div>
          <div className="map-castle" />
          {stageNodes.map((node) => {
            const nodeUnlocked = isStageUnlocked(node.id, playerState);
            const nodeCleared = playerState.clearedStages.includes(node.id);
            return (
              <button
                key={node.id}
                className={`stage-node ${selectedStage === node.id ? 'selected' : ''} ${nodeCleared ? 'cleared' : ''} ${
                  nodeUnlocked ? '' : 'locked'
                }`}
                style={{ left: `${node.x}%`, top: `${node.y}%` }}
                onClick={() => handleNodeClick(node.id)}
              >
                <span>{nodeUnlocked ? node.id : '鍵'}</span>
                <small>{nodeCleared ? '★★★' : nodeUnlocked ? '☆☆☆' : 'LOCK'}</small>
              </button>
            );
          })}
        </div>

        <aside className="stage-info-panel">
          <div className="stage-number">STAGE {selectedNode.id}</div>
          <h2>{selectedNode.name}</h2>
          <p>{selectedNode.id <= 7 ? '緑の谷に続く防衛線。敵の増援を村へ通さない。' : '闇が濃くなる高難度地帯。育成した隊員で挑む。'}</p>
          <div className="stage-enemies">
            <div className="panel-label">出現する敵</div>
            <div className="enemy-type-row">
              {enemyTypes.map((type) => (
                <span key={type}>{type}</span>
              ))}
            </div>
          </div>
          <div className="recommended-power">
            推奨戦力 <strong>{(selectedNode.id * 820).toLocaleString('ja-JP')}</strong>
          </div>
          <div className="reward-row">
            <div>Gold</div>
            <div>EXP</div>
            <div>星報酬</div>
          </div>
          <div className="stage-state">{cleared ? 'クリア済み' : unlocked ? '出撃可能' : 'ロック中'}</div>
          <button className="action-button red deploy-button" disabled={!unlocked} onClick={() => onDeploy(selectedNode.id)}>
            出撃
          </button>
        </aside>
      </div>
    </section>
  );
}
