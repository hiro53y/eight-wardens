import { useEffect, useMemo, useState } from 'react';
import { BattleScreen } from './components/BattleScreen';
import { EncyclopediaScreen } from './components/EncyclopediaScreen';
import { RotateDeviceNotice } from './components/RotateDeviceNotice';
import { SettingsScreen } from './components/SettingsScreen';
import { StageSelectScreen } from './components/StageSelectScreen';
import { TitleScreen } from './components/TitleScreen';
import { UnitManagementScreen } from './components/UnitManagementScreen';
import { createBattleState } from './engine/gameLoop';
import { playSceneBgm, unlockAudio } from './engine/audio';
import { createInitialPlayerState } from './engine/progression';
import { clearSave, hasSave, loadGame, loadSettings, saveGame, saveSettings } from './engine/save';
import type { BattleState, PlayerState, Screen, SettingsState } from './types/game';

function useIsPortrait(): boolean {
  const [isPortrait, setIsPortrait] = useState(() => window.innerHeight > window.innerWidth);

  useEffect(() => {
    const handleResize = () => setIsPortrait(window.innerHeight > window.innerWidth);
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  return isPortrait;
}

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('title');
  const [playerState, setPlayerState] = useState<PlayerState>(() => loadGame() ?? createInitialPlayerState());
  const [battleState, setBattleState] = useState<BattleState | null>(null);
  const [selectedStage, setSelectedStage] = useState(1);
  const [settings, setSettings] = useState<SettingsState>(() => loadSettings());
  const [toast, setToast] = useState('');
  const [saveActive, setSaveActive] = useState(() => hasSave());
  const [sessionStarted, setSessionStarted] = useState(() => hasSave());
  const isPortrait = useIsPortrait();

  useEffect(() => {
    if (!toast) {
      return;
    }
    const timer = window.setTimeout(() => setToast(''), 2200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  useEffect(() => {
    playSceneBgm(currentScreen, selectedStage, settings.bgm);
  }, [currentScreen, selectedStage, settings.bgm]);

  useEffect(() => {
    if (!sessionStarted) {
      return;
    }
    const timer = window.setTimeout(() => {
      saveGame(playerState);
      setSaveActive(true);
    }, 300);

    return () => window.clearTimeout(timer);
  }, [playerState, sessionStarted]);

  const showToast = (message: string) => setToast(message);

  const startNewGame = () => {
    unlockAudio();
    const newPlayer = createInitialPlayerState();
    setPlayerState(newPlayer);
    setBattleState(null);
    setSelectedStage(1);
    setSessionStarted(true);
    saveGame(newPlayer);
    setSaveActive(true);
    setCurrentScreen('stageSelect');
  };

  const continueGame = () => {
    unlockAudio();
    const loaded = loadGame() ?? createInitialPlayerState();
    setPlayerState(loaded);
    setBattleState(null);
    setSelectedStage(Math.min(10, Math.max(1, loaded.currentStage + 1)));
    setSessionStarted(true);
    saveGame(loaded);
    setSaveActive(true);
    setCurrentScreen('stageSelect');
  };

  const startBattle = (stageId: number) => {
    unlockAudio();
    setSelectedStage(stageId);
    setBattleState(createBattleState(stageId, playerState.units[0].id));
    setSessionStarted(true);
    setCurrentScreen('battle');
  };

  const handleClearSave = () => {
    clearSave();
    const fresh = createInitialPlayerState();
    setPlayerState(fresh);
    setBattleState(null);
    setSaveActive(false);
    setSessionStarted(false);
    setSelectedStage(1);
    showToast('セーブデータを削除しました');
  };

  const renderedScreen = useMemo(() => {
    if (currentScreen === 'title') {
      return (
        <TitleScreen
          hasLocalSave={saveActive}
          onStart={startNewGame}
          onContinue={continueGame}
          onOpenEncyclopedia={() => setCurrentScreen('encyclopedia')}
          onOpenSettings={() => setCurrentScreen('settings')}
        />
      );
    }

    if (currentScreen === 'stageSelect') {
      return (
        <StageSelectScreen
          playerState={playerState}
          selectedStage={selectedStage}
          onSelectStage={setSelectedStage}
          onDeploy={startBattle}
          onBack={() => setCurrentScreen('title')}
          onOpenUnits={() => setCurrentScreen('unitManagement')}
          onOpenEncyclopedia={() => setCurrentScreen('encyclopedia')}
          onOpenSettings={() => setCurrentScreen('settings')}
          onToast={showToast}
        />
      );
    }

    if (currentScreen === 'battle' && battleState) {
      return (
        <BattleScreen
          playerState={playerState}
          setPlayerState={setPlayerState}
          battleState={battleState}
          setBattleState={setBattleState}
          onBackToMap={() => setCurrentScreen('stageSelect')}
          onOpenSettings={() => setCurrentScreen('settings')}
          onToast={showToast}
          seEnabled={settings.se}
        />
      );
    }

    if (currentScreen === 'unitManagement') {
      return (
        <UnitManagementScreen
          playerState={playerState}
          setPlayerState={setPlayerState}
          onBack={() => setCurrentScreen('stageSelect')}
          onToast={showToast}
        />
      );
    }

    if (currentScreen === 'encyclopedia') {
      return <EncyclopediaScreen onBack={() => setCurrentScreen(saveActive ? 'stageSelect' : 'title')} />;
    }

    return (
      <SettingsScreen
        settings={settings}
        setSettings={setSettings}
        onClearSave={handleClearSave}
        onBackTitle={() => setCurrentScreen('title')}
        onBack={() => setCurrentScreen(saveActive ? 'stageSelect' : 'title')}
      />
    );
  }, [battleState, currentScreen, playerState, saveActive, selectedStage, settings]);

  if (isPortrait) {
    return <RotateDeviceNotice />;
  }

  return (
    <div className="app-shell">
      <main className="game-frame">{renderedScreen}</main>
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
