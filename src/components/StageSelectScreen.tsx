import { enemies } from '../data/enemies';
import { effectArt, stageBackgrounds, uiArt } from '../data/artAssets';
import { getWavesForStage } from '../data/waves';
import { isStageUnlocked } from '../engine/progression';
import type { PlayerState } from '../types/game';
import { EnemySprite, MarkerSprite } from './AssetSprite';

interface StageSelectScreenProps {
  playerState: PlayerState;
  selectedStage: number;
  onSelectStage: (stageId: number) => void;
  onDeploy: (stageId: number) => void;
  onBack: () => void;
  onOpenUnits: () => void;
  onOpenSettings: () => void;
  onToast: (message: string) => void;
}

const TRAINING_STAGE_ID = 0;

const stageNodes = [
  { id: TRAINING_STAGE_ID, name: '訓練場', x: 10, y: 54, training: true },
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

const enemyLabels: Record<string, string> = {
  normal: 'スライム',
  fly: '飛行',
  boss: 'ボス',
  rapid: '高速',
  metal: 'メタル',
};

const enemyRepresentative: Record<string, string> = {
  normal: 'grassSlime',
  fly: 'smallBat',
  boss: 'bigWorm',
  rapid: 'dashBird',
  metal: 'metalSlime',
};

export function StageSelectScreen({
  playerState,
  selectedStage,
  onSelectStage,
          onDeploy,
          onBack,
          onOpenUnits,
          onOpenSettings,
          onToast,
}: StageSelectScreenProps) {
  const selectedNode = stageNodes.find((node) => node.id === selectedStage) ?? stageNodes[0];
  const isTrainingStage = selectedNode.id === TRAINING_STAGE_ID;
  const unlocked = isStageUnlocked(selectedNode.id, playerState);
  const cleared = playerState.clearedStages.includes(selectedNode.id);
  const selectedWaves = getWavesForStage(selectedNode.id);
  const enemyTypes = Array.from(new Set(selectedWaves.flatMap((wave) => wave.entries.map((entry) => enemies[entry.enemyId].type))));

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
        <button className="nav-back icon-back" onClick={onBack}>
          戻る
        </button>
        <div className="map-title">冒険</div>
        <button className="tab active">マップ</button>
        <button className="tab" onClick={onOpenUnits}>
          部隊
        </button>
        <div className="header-stat">GOLD {playerState.gold.toLocaleString('ja-JP')}</div>
        <div className="header-stat">村耐久 {playerState.villageHp}/{playerState.maxVillageHp}</div>
        <button className="nav-back icon-settings" onClick={onOpenSettings}>
          設定
        </button>
      </header>

      <div className="map-layout">
        <div className="world-map upgraded-world-map" style={{ backgroundImage: `url("${stageBackgrounds.map}")` }}>
          <img className="map-route-line map-route-line-a" src={effectArt.routeDotted} alt="" />
          <img className="map-route-line map-route-line-b" src={effectArt.routeCurve} alt="" />
          <div className="chapter-banner">
            <img src="/assets/ui/crest.svg" alt="" />
            <span>第1章</span>
            <strong>緑風の平原</strong>
          </div>
          <div className="map-village">村落</div>
          <div className="map-castle" />
          <div className="map-creature map-creature-a"><EnemySprite enemyId="metalSlime" /></div>
          <div className="map-creature map-creature-b"><EnemySprite enemyId="smallBat" /></div>
          <div className="map-creature map-creature-c"><MarkerSprite type="danger" /></div>
          {stageNodes.map((node) => {
            const nodeUnlocked = isStageUnlocked(node.id, playerState);
            const nodeCleared = playerState.clearedStages.includes(node.id);
            return (
              <button
                key={node.id}
                className={`stage-node ${node.training ? 'training' : ''} ${selectedStage === node.id ? 'selected' : ''} ${nodeCleared ? 'cleared' : ''} ${
                  nodeUnlocked ? '' : 'locked'
                }`}
                style={{ left: `${node.x}%`, top: `${node.y}%` }}
                onClick={() => handleNodeClick(node.id)}
                >
                <span>
                  {nodeUnlocked ? <MarkerSprite type={nodeCleared ? 'cleared' : 'stage'} /> : <img className="map-lock-icon" src={uiArt.icons.lock} alt="" />}
                  {nodeUnlocked && <b>{node.training ? '訓' : node.id}</b>}
                </span>
                <small>{node.training ? '周回' : nodeCleared ? '★★★' : nodeUnlocked ? '☆☆☆' : ''}</small>
              </button>
            );
          })}
        </div>

        <aside className="stage-info-panel">
          <div className="stage-number">{isTrainingStage ? 'TRAINING' : `STAGE ${selectedNode.id}`}</div>
          <h2>{selectedNode.name}</h2>
          <p>
            {isTrainingStage
              ? 'Goldと全員EXPを稼ぐための反復訓練。クリアしてもメイン進行は進まず、何度でも挑戦できる。'
              : selectedNode.id <= 7
                ? '緑の谷に続く防衛線。敵の増援を村へ通さない。'
                : '闇が濃くなる高難度地帯。育成した隊員で挑む。'}
          </p>
          <div className="stage-enemies">
            <div className="panel-label">出現する敵</div>
            <div className="enemy-type-row">
              {enemyTypes.map((type) => (
                <span key={type} className={`enemy-chip enemy-${type}`}>
                  <i><EnemySprite enemyId={enemyRepresentative[type] ?? 'grassSlime'} /></i>
                  {enemyLabels[type] ?? type}
                </span>
              ))}
            </div>
          </div>
          <div className="recommended-power">
            推奨戦力 <strong>{isTrainingStage ? '基礎訓練' : (selectedNode.id * 820).toLocaleString('ja-JP')}</strong>
          </div>
          <div className="reward-row">
            <div><img src={uiArt.icons.coin} alt="" />金貨 x{isTrainingStage ? 240 : selectedNode.id * 120}</div>
            <div><img src={uiArt.icons.gem} alt="" />{isTrainingStage ? '全員EXP x25' : `宝石 x${selectedNode.id + 4}`}</div>
            <div>{isTrainingStage ? '周回可' : '星報酬'}</div>
          </div>
          <div className="stamina-row">消費スタミナ <strong>{isTrainingStage ? 0 : 1}</strong></div>
          <div className="stage-state">{isTrainingStage ? '何度でも挑戦可能' : cleared ? 'クリア済み' : unlocked ? '出撃可能' : 'ロック中'}</div>
          <button className="action-button red deploy-button" disabled={!unlocked} onClick={() => onDeploy(selectedNode.id)}>
            {isTrainingStage ? '訓練開始' : '出撃'}
          </button>
        </aside>
      </div>
    </section>
  );
}
