interface TitleScreenProps {
  hasLocalSave: boolean;
  onStart: () => void;
  onContinue: () => void;
  onOpenEncyclopedia: () => void;
  onOpenSettings: () => void;
}

export function TitleScreen({
  hasLocalSave,
  onStart,
  onContinue,
  onOpenEncyclopedia,
  onOpenSettings,
}: TitleScreenProps) {
  return (
    <section className="screen title-screen">
      <div className="title-top-actions">
        <button className="small-fantasy-button">お知らせ</button>
        <button className="small-fantasy-button">特典受取</button>
      </div>
      <div className="account-button">ローカルセーブ {hasLocalSave ? '有効' : 'なし'}</div>

      <div className="title-landscape">
        <div className="mountain mountain-left" />
        <div className="mountain mountain-right" />
        <div className="river" />
        <div className="enemy-road" />
        <div className="title-village" />
        <div className="enemy-dot enemy-dot-a" />
        <div className="enemy-dot enemy-dot-b" />
        <div className="enemy-dot enemy-dot-c" />
        <div className="warden-row">
          {['神', '砲', '忍', '斥', '剣', '弓', '盾', '斥'].map((label, index) => (
            <div className="title-warden" key={`${label}-${index}`}>
              {label}
            </div>
          ))}
        </div>
      </div>

      <div className="title-logo">
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

      <div className="version-label">Ver.1.0.0</div>
    </section>
  );
}
