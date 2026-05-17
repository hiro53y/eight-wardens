import type { CSSProperties } from 'react';
import { classList } from '../data/classes';
import { enemyList } from '../data/enemies';
import { EnemySprite, WardenSprite } from './AssetSprite';

interface EncyclopediaScreenProps {
  onBack: () => void;
}

export function EncyclopediaScreen({ onBack }: EncyclopediaScreenProps) {
  return (
    <section className="screen encyclopedia-screen">
      <header className="simple-header">
        <button className="nav-back icon-back" onClick={onBack}>
          戻る
        </button>
        <h1>図鑑</h1>
        <div className="header-note">今後、詳細な討伐記録とストーリーを追加予定</div>
      </header>

      <div className="encyclopedia-layout">
        <div className="book-panel">
          <h2>敵一覧</h2>
          <div className="book-grid">
            {enemyList.map((enemy) => (
              <div className="book-card" key={enemy.id}>
                <div className={`book-icon enemy-icon enemy-${enemy.type}`} style={{ '--enemy-color': enemy.color } as CSSProperties}>
                  <EnemySprite enemyId={enemy.id} />
                </div>
                <strong>{enemy.name}</strong>
                <span>{enemy.type}</span>
                <small>HP {enemy.hp} / Gold {enemy.gold} / EXP {enemy.exp}</small>
              </div>
            ))}
          </div>
        </div>

        <div className="book-panel">
          <h2>職業一覧</h2>
          <div className="book-grid class-book">
            {classList.map((unitClass) => (
              <div className="book-card" key={unitClass.id}>
                <div className="book-class-icon" style={{ background: unitClass.color }}>
                  <WardenSprite classId={unitClass.id} />
                </div>
                <strong>{unitClass.name}</strong>
                <span>{unitClass.tier}</span>
                <small>{unitClass.role}</small>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
