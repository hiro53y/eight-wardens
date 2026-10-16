// 画面の切り替えと、進み・設定の保存
import { useCallback, useEffect, useState } from 'react';
import { playBgm, resumeBgm, setBgmVolume } from '../audio/bgm';
import { setSeVolume, unlockAudio } from '../audio/sound';
import { newProgress } from '../game/progress';
import { loadProgress, loadSettings, saveProgress, saveSettings, wipe } from '../game/save';
import type { Mode, Progress, Settings } from '../game/types';
import { loadImages } from '../view/assets';
import { BattleScreen } from './BattleScreen';
import { MapScreen } from './MapScreen';
import { Title } from './Title';

type Screen = { k: 'title' } | { k: 'map' } | { k: 'battle'; stage: number; key: number };

export function App() {
  const [screen, setScreen] = useState<Screen>({ k: 'title' });
  const [p, setP] = useState<Progress | null>(() => loadProgress());
  const [settings, setSettings] = useState<Settings>(() => loadSettings());
  const [, setRev] = useState(0);
  const [loaded, setLoaded] = useState(0);

  useEffect(() => { loadImages((d, t) => setLoaded(d / t)); }, []);
  useEffect(() => { setSeVolume(settings.se); setBgmVolume(settings.bgm); saveSettings(settings); }, [settings]);

  // 最初に触れた時に音を出せるようにする
  useEffect(() => {
    const on = () => { unlockAudio(); resumeBgm(); };
    window.addEventListener('pointerdown', on);
    return () => window.removeEventListener('pointerdown', on);
  }, []);

  useEffect(() => {
    if (screen.k === 'title') playBgm('title');
    else if (screen.k === 'map') playBgm('map');
  }, [screen.k]);

  /** 進みを書き換えた後に呼ぶ（保存して描き直す） */
  const touch = useCallback(() => {
    if (p) saveProgress(p);
    setRev((r) => r + 1);
  }, [p]);

  const start = (mode: Mode) => {
    const np = newProgress(mode, (Date.now() & 0x7fffffff) ^ 0x5eed);
    saveProgress(np);
    setP(np);
    setScreen({ k: 'map' });
  };

  const onWipe = () => {
    wipe();
    setP(null);
    setScreen({ k: 'title' });
  };

  if (screen.k === 'title' || !p) {
    return (
      <Title
        loaded={loaded}
        hasSave={!!p}
        settings={settings}
        onSettings={setSettings}
        onNew={start}
        onContinue={() => p && setScreen({ k: 'map' })}
        onWipe={onWipe}
      />
    );
  }
  if (screen.k === 'map') {
    return (
      <MapScreen
        p={p}
        settings={settings}
        onSettings={setSettings}
        onChange={touch}
        onPlay={(id) => setScreen({ k: 'battle', stage: id, key: Date.now() })}
        onTitle={() => setScreen({ k: 'title' })}
        onWipe={onWipe}
      />
    );
  }
  return (
    <BattleScreen
      key={screen.key}
      p={p}
      stageId={screen.stage}
      settings={settings}
      onSettings={setSettings}
      onChange={touch}
      onMap={() => setScreen({ k: 'map' })}
      onPlay={(id) => setScreen({ k: 'battle', stage: id, key: Date.now() })}
    />
  );
}
