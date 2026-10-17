// 画面の切り替えと、進み・設定の保存
import { useCallback, useEffect, useState } from 'react';
import { playBgm, resumeBgm, setBgmVolume } from '../audio/bgm';
import { setSeVolume, unlockAudio } from '../audio/sound';
import { newProgress } from '../game/progress';
import { hasStoredProgress, loadProgress, loadSettings, saveProgress, saveSettings, wipe } from '../game/save';
import type { Mode, Progress, Settings } from '../game/types';
import { loadImages } from '../view/assets';
import { BattleScreen, type BattleMode } from './BattleScreen';
import { startTower } from '../game/tower';
import { MapScreen } from './MapScreen';
import { Title } from './Title';

type Screen = { k: 'title' } | { k: 'map' } | { k: 'battle'; mode: BattleMode; key: number };

function reviewProgress(){const p=newProgress('normal',310);p.unlocked=35;p.exp=50000;p.coins=50000;p.wardens.forEach(w=>{w.lv=3;});return p;}
export function App() {
  const review=import.meta.env.DEV&&new URLSearchParams(location.search).get('qa')==='review';
  const [screen, setScreen] = useState<Screen>(review?{k:'map'}:{k:'title'});
  const [hasRecord,setHasRecord]=useState(()=>hasStoredProgress());
  const [p, setP] = useState<Progress | null>(() => review?reviewProgress():loadProgress());
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
    setHasRecord(true);
    setP(np);
    setScreen({ k: 'map' });
  };

  /** 合戦へ（塔は挑戦中でなければ始める） */
  const play = (mode: BattleMode) => {
    if (!p) return;
    if (mode.kind === 'tower') {
      if (!p.tower.run) startTower(p);
      else if (p.tower.run.choosing) { setScreen({ k: 'map' }); return; }
      saveProgress(p);
    }
    setScreen({ k: 'battle', mode, key: Date.now() });
  };

  const onWipe = () => {
    wipe();
    setHasRecord(false);
    setP(null);
    setScreen({ k: 'title' });
  };

  if (screen.k === 'title' || !p) {
    return (
      <Title
        loaded={loaded}
        hasSave={!!p}
        hasRecord={hasRecord}
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
        onPlay={(id) => play({ kind: 'stage', stage: id })}
        onTower={() => play({ kind: 'tower' })}
        onDaily={() => play({ kind: 'daily' })}
        onTitle={() => setScreen({ k: 'title' })}
        onWipe={onWipe}
      />
    );
  }
  return (
    <BattleScreen
      key={screen.key}
      p={p}
      mode={screen.mode}
      settings={settings}
      onSettings={setSettings}
      onChange={touch}
      onMap={() => setScreen({ k: 'map' })}
      onPlay={play}
    />
  );
}
