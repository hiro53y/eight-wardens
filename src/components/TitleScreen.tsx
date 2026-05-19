interface TitleScreenProps {
  onStart: () => void;
  onContinue: () => void;
  onOpenSettings: () => void;
}

export function TitleScreen({
  onStart,
  onContinue,
  onOpenSettings,
}: TitleScreenProps) {
  return (
    <section className="screen title-screen">
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
        <button className="action-button gray" onClick={onOpenSettings}>
          設定
        </button>
      </nav>

      <div className="version-label">Ver.1.1.0</div>
    </section>
  );
}
