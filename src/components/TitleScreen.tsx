import { initialUnits } from '../data/initialUnits';
import { unitClasses } from '../data/classes';
import { WardenSprite } from './AssetSprite';

interface TitleScreenProps {
  hasLocalSave: boolean;
  onStart: () => void;
  onContinue: () => void;
  onOpenEncyclopedia: () => void;
  onOpenSettings: () => void;
}

export function TitleScreen({
  onStart,
  onContinue,
  onOpenEncyclopedia,
  onOpenSettings,
}: TitleScreenProps) {
  const titleUnits = [
    initialUnits[7],
    initialUnits[5],
    initialUnits[6],
    initialUnits[2],
    initialUnits[0],
    initialUnits[1],
    initialUnits[4],
    initialUnits[3],
  ];

  return (
    <section className="screen title-screen">
      <div className="title-landscape">
        <div className="enemy-column">
          <span className="banner-skull">!</span>
          <i className="enemy-shape bat" />
          <i className="enemy-shape slime" />
          <i className="enemy-shape brute" />
        </div>
        <div className="title-castle-flag" />
        <div className="warden-row">
          {titleUnits.map((unit) => (
            <div className="title-warden" key={unit.id}>
              <WardenSprite classId={unit.classId} />
              <small>{unitClasses[unit.classId].name}</small>
            </div>
          ))}
        </div>
      </div>

      <div className="title-logo">
        <img src="/assets/ui/crest.svg" alt="" />
        <div className="title-main">Eight Wardens</div>
        <div className="title-sub">八人の防衛隊</div>
      </div>

      <nav className="title-menu">
        <button className="action-button green" onClick={onStart}>
          はじめる
        </button>
        <button className="action-button blue" onClick={onContinue}>
          つづきから
        </button>
        <button className="action-button purple" onClick={onOpenEncyclopedia}>
          図鑑
        </button>
        <button className="action-button gray" onClick={onOpenSettings}>
          設定
        </button>
      </nav>

      <div className="version-label">Ver.1.1.0</div>
    </section>
  );
}
