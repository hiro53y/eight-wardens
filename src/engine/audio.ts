import type { Screen } from '../types/game';

let bgm: HTMLAudioElement | null = null;
let currentBgmSrc = '';
let unlocked = false;

const sceneBgm: Partial<Record<Screen, string>> = {
  title: '/assets/audio/bgm/title.mp3',
  stageSelect: '/assets/audio/bgm/map.mp3',
  unitManagement: '/assets/audio/bgm/unit-management.mp3',
  encyclopedia: '/assets/audio/bgm/encyclopedia.mp3',
  settings: '/assets/audio/bgm/settings.mp3',
};

export function unlockAudio() {
  unlocked = true;
}

export function playSceneBgm(screen: Screen, stageId: number, enabled: boolean) {
  if (!enabled || !unlocked || typeof Audio === 'undefined') {
    return;
  }

  const src = screen === 'battle' ? `/assets/audio/bgm/stage-${stageId}.mp3` : sceneBgm[screen];
  if (!src || src === currentBgmSrc) {
    return;
  }

  if (!bgm) {
    bgm = new Audio();
    bgm.loop = true;
    bgm.volume = 0.42;
  }

  bgm.pause();
  bgm.src = src;
  currentBgmSrc = src;
  void bgm.play().catch(() => {
    currentBgmSrc = '';
  });
}

export function playDamageSe(enabled: boolean) {
  if (!enabled || !unlocked || typeof Audio === 'undefined') {
    return;
  }
  const se = new Audio('/assets/audio/se/damage.mp3');
  se.volume = 0.55;
  void se.play().catch(() => undefined);
}
