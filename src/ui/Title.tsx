// タイトル：はじめる（難易度）／つづきから／遊び方／設定
import { useState } from 'react';
import { playSe } from '../audio/sound';
import type { Mode, Settings } from '../game/types';
import { imgUrl } from '../view/assets';
import { Help, Modal, SettingsPanel, VERSION } from './common';

interface Props {
  loaded: number;
  hasSave: boolean;
  settings: Settings;
  onSettings: (s: Settings) => void;
  onNew: (mode: Mode) => void;
  onContinue: () => void;
  onWipe: () => void;
}

export function Title({ loaded, hasSave, settings, onSettings, onNew, onContinue, onWipe }: Props) {
  const [modal, setModal] = useState<'' | 'mode' | 'help' | 'settings'>('');
  const [overwrite, setOverwrite] = useState<Mode | null>(null);
  const ready = loaded >= 1;
  const pick = (m: Mode) => {
    if (hasSave && overwrite !== m) { setOverwrite(m); playSe('menu'); return; }
    playSe('equip');
    onNew(m);
  };
  return (
    <div className="screen title-screen" style={{ backgroundImage: `url(${imgUrl('title')})` }}>
      <div className="title-shade" />
      <div className="title-box">
        <div className="logo">
          <div className="logo-en">EIGHT WARDENS</div>
          <div className="logo-ja">八人の防衛隊</div>
        </div>
        {!ready ? (
          <div className="loading"><div className="bar"><i style={{ width: `${Math.round(loaded * 100)}%` }} /></div><span>読み込み中… {Math.round(loaded * 100)}%</span></div>
        ) : (
          <div className="title-menu">
            {hasSave && <button className="btn gold big" onClick={() => { playSe('equip'); onContinue(); }}>つづきから</button>}
            <button className={`btn ${hasSave ? '' : 'gold big'}`} onClick={() => { playSe('menu'); setOverwrite(null); setModal('mode'); }}>はじめから</button>
            <div className="title-sub">
              <button className="btn small" onClick={() => { playSe('menu'); setModal('help'); }}>遊び方</button>
              <button className="btn small" onClick={() => { playSe('menu'); setModal('settings'); }}>設定</button>
            </div>
          </div>
        )}
      </div>
      <div className="title-ver">Ver.{VERSION}</div>
      {modal === 'mode' && (
        <Modal title="難しさを選ぶ" onClose={() => setModal('')}>
          <div className="modes">
            <button className="mode-card" onClick={() => pick('normal')}>
              <b>ふつう</b>
              <span>村人10人。3段目の職は Lv5 まで。</span>
            </button>
            <button className="mode-card pro" onClick={() => pick('pro')}>
              <b>玄人</b>
              <span>村人8人。敵が硬く、転職が高い。3段目の職は Lv10 まで育つ。</span>
            </button>
          </div>
          {overwrite && <p className="warn">今の記録は消えて、最初からになります。もう一度押すと始めます。</p>}
        </Modal>
      )}
      {modal === 'help' && <Help onClose={() => setModal('')} />}
      {modal === 'settings' && <SettingsPanel settings={settings} onSettings={onSettings} onClose={() => setModal('')} onWipe={hasSave ? onWipe : undefined} />}
    </div>
  );
}
