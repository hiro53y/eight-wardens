import type { Dispatch, SetStateAction } from 'react';
import type { SettingsState } from '../types/game';

interface SettingsScreenProps {
  settings: SettingsState;
  setSettings: Dispatch<SetStateAction<SettingsState>>;
  onClearSave: () => void;
  onBackTitle: () => void;
  onBack: () => void;
}

export function SettingsScreen({ settings, setSettings, onClearSave, onBackTitle, onBack }: SettingsScreenProps) {
  return (
    <section className="screen settings-screen">
      <header className="simple-header">
        <button className="nav-back" onClick={onBack}>
          戻る
        </button>
        <h1>設定</h1>
        <div className="header-note">音量設定は値のみ保存します</div>
      </header>

      <div className="settings-panel">
        <label className="setting-row">
          <span>BGM</span>
          <input
            type="checkbox"
            checked={settings.bgm}
            onChange={(event) => setSettings((current) => ({ ...current, bgm: event.target.checked }))}
          />
        </label>
        <label className="setting-row">
          <span>SE</span>
          <input
            type="checkbox"
            checked={settings.se}
            onChange={(event) => setSettings((current) => ({ ...current, se: event.target.checked }))}
          />
        </label>
        <button className="action-button red" onClick={onClearSave}>
          データ削除
        </button>
        <button className="action-button blue" onClick={onBackTitle}>
          タイトルに戻る
        </button>
      </div>
    </section>
  );
}
