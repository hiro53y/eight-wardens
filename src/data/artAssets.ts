export const wardenSheet = {
  url: '/assets/generated/warden-chibi-sheet.png?v=20260517-chibi1',
  columns: 4,
  rows: 2,
} as const;

export const enemySheet = {
  url: '/assets/generated/enemy-chibi-sheet.png?v=20260517-chibi1',
  columns: 5,
  rows: 2,
} as const;

export const classSpriteIndex: Record<string, number> = {
  swordsman: 0,
  kensai: 0,
  swordmaster: 0,
  archer: 1,
  ranger: 1,
  windArcher: 1,
  scout: 2,
  trapper: 2,
  binder: 2,
  heavyKnight: 4,
  darkKnight: 4,
  artillerist: 5,
  gunner: 5,
  sniper: 5,
  ninja: 6,
  assassin: 6,
  priest: 7,
  cleric: 7,
  saint: 7,
};

export const enemySpriteIndex: Record<string, number> = {
  grassSlime: 0,
  runningChick: 1,
  smallBat: 2,
  blueSlime: 3,
  bigWorm: 4,
  bigSlime: 5,
  dashBird: 6,
  batSwarm: 7,
  metalSlime: 8,
  poisonScorpion: 9,
};
