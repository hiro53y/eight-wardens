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
  const wardens = ['神官', '砲術士', '忍者', '斥候', '剣士', '弓兵', '重装', '斥候'];

  return (
    <section className="screen title-screen">
      <div className="title-top-actions">
        <button className="small-fantasy-button">告 お知らせ</button>
        <button className="small-fantasy-button">贈 特典受取</button>
      </div>
      <div className="account-button">ローカルセーブ {hasLocalSave ? '有効' : '待機'}</div>

      <div className="title-landscape">
        <div className="enemy-column">
          <span className="banner-skull">!</span>
          <i className="enemy-shape bat" />
          <i className="enemy-shape slime" />
          <i className="enemy-shape brute" />
        </div>
        <div className="title-castle-flag" />
        <div className="warden-row">
          {wardens.map((label, index) => (
            <div className="title-warden" key={`${label}-${index}`}>
              <span>{label.slice(0, 1)}</span>
              <small>{label}</small>
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

      <div className="version-label">Ver.1.0.0</div>
    </section>
  );
}
