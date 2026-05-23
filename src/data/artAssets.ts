export const ASSET_BASE = '/assets/game/';

const gameAsset = (path: string) => `${ASSET_BASE}${path}`;

export type UnitArtVariant = 'portrait' | 'face' | 'battle';

export interface UnitArt {
  portrait: string;
  face: string;
  battle: string;
}

const unitArt = (key: string): UnitArt => ({
  portrait: gameAsset(`units/portraits/unit_${key}_portrait.png`),
  face: gameAsset(`units/faces/unit_${key}_face.png`),
  battle: gameAsset(`units/battle/unit_${key}_battle_idle.png`),
});

export const stageBackgrounds = {
  map: gameAsset('backgrounds/chapter1_world_map.png'),
  battle: gameAsset('backgrounds/battle_village_gate_day.png'),
  result: gameAsset('backgrounds/result_stage_clear_bg.png'),
} as const;

export const unitArtByKey = {
  alto: unitArt('alto'),
  ryuka: unitArt('ryuka'),
  minato: unitArt('minato'),
  iris: unitArt('iris'),
  kai: unitArt('kai'),
  glen: unitArt('glen'),
  shino: unitArt('shino'),
} as const;

export const unitArtByUnitId: Record<string, UnitArt> = {
  'unit-1': unitArtByKey.alto,
  'unit-2': unitArtByKey.ryuka,
  'unit-3': unitArtByKey.minato,
  'unit-4': unitArtByKey.kai,
  'unit-5': unitArtByKey.glen,
  'unit-6': unitArtByKey.glen,
  'unit-7': unitArtByKey.shino,
  'unit-8': unitArtByKey.iris,
};

export const unitArtByClassId: Record<string, UnitArt> = {
  swordsman: unitArtByKey.alto,
  kensai: unitArtByKey.alto,
  swordmaster: unitArtByKey.alto,
  archer: unitArtByKey.ryuka,
  ranger: unitArtByKey.ryuka,
  windArcher: unitArtByKey.ryuka,
  scout: unitArtByKey.kai,
  trapper: unitArtByKey.kai,
  binder: unitArtByKey.kai,
  heavyKnight: unitArtByKey.minato,
  darkKnight: unitArtByKey.minato,
  artillerist: unitArtByKey.glen,
  gunner: unitArtByKey.glen,
  sniper: unitArtByKey.glen,
  ninja: unitArtByKey.shino,
  assassin: unitArtByKey.shino,
  priest: unitArtByKey.iris,
  cleric: unitArtByKey.iris,
  saint: unitArtByKey.iris,
};

export const enemyArtByEnemyId: Record<string, string> = {
  grassSlime: gameAsset('enemies/enemy_slime.png'),
  runningChick: gameAsset('enemies/enemy_runner_chick.png'),
  smallBat: gameAsset('enemies/enemy_wingbat.png'),
  blueSlime: gameAsset('enemies/enemy_slime.png'),
  bigWorm: gameAsset('enemies/enemy_orc.png'),
  bigSlime: gameAsset('enemies/enemy_goblin.png'),
  dashBird: gameAsset('enemies/enemy_runner_chick.png'),
  batSwarm: gameAsset('enemies/enemy_wingbat.png'),
  metalSlime: gameAsset('enemies/enemy_wolf_elite.png'),
  poisonScorpion: gameAsset('enemies/enemy_orc.png'),
};

export const effectArt = {
  slash: gameAsset('effects/fx_slash_blue.png'),
  hit: gameAsset('effects/fx_hit_flash_orange.png'),
  magic: gameAsset('effects/fx_magic_bolt_purple.png'),
  target: gameAsset('effects/fx_target_ring_red.png'),
  heal: gameAsset('effects/fx_heal_ring_green.png'),
  buff: gameAsset('effects/fx_buff_ring_gold.png'),
  sparkle: gameAsset('effects/fx_holy_sparkle_white.png'),
  recovery: gameAsset('effects/fx_recovery_glow_green.png'),
  routeLine: gameAsset('effects/fx_route_line_red.png'),
  routeCurve: gameAsset('effects/fx_route_curve_red.png'),
  routeDotted: gameAsset('effects/fx_route_dotted_red.png'),
  routeWarning: gameAsset('effects/fx_route_lane_warning_red.png'),
} as const;

export const bannerArt = {
  waveStart: gameAsset('banners/banner_wave_start.png'),
  eliteWarning: gameAsset('banners/banner_elite_warning.png'),
  bossWarning: gameAsset('banners/banner_boss_warning.png'),
  stageClear: gameAsset('banners/banner_stage_clear.png'),
  victoryFlourish: gameAsset('banners/deco_victory_flourish_gold.png'),
  rewardSparkle: gameAsset('banners/deco_reward_sparkle_gold.png'),
  threeStar: gameAsset('banners/deco_three_star_clear.png'),
} as const;

export const uiArt = {
  panels: {
    main: gameAsset('ui/panels/ui_panel_main.png'),
    party: gameAsset('ui/panels/ui_panel_party.png'),
    tall: gameAsset('ui/panels/ui_panel_tall.png'),
    small: gameAsset('ui/panels/ui_panel_small.png'),
  },
  buttons: {
    blue: gameAsset('ui/buttons/ui_button_blue.png'),
    red: gameAsset('ui/buttons/ui_button_red.png'),
    green: gameAsset('ui/buttons/ui_button_green.png'),
    purple: gameAsset('ui/buttons/ui_button_purple.png'),
    brown: gameAsset('ui/buttons/ui_button_brown.png'),
  },
  bars: {
    hp: gameAsset('ui/bars/ui_hp_bar.png'),
    mp: gameAsset('ui/bars/ui_mp_bar.png'),
    vertical: gameAsset('ui/bars/ui_vertical_gauge.png'),
  },
  icons: {
    coin: gameAsset('ui/icons/ui_icon_coin.png'),
    gem: gameAsset('ui/icons/ui_icon_gem.png'),
    shield: gameAsset('ui/icons/ui_icon_shield.png'),
    sword: gameAsset('ui/icons/ui_icon_sword.png'),
    lock: gameAsset('ui/icons/ui_icon_lock.png'),
    starGold: gameAsset('ui/icons/ui_icon_star_gold.png'),
    starEmpty: gameAsset('ui/icons/ui_icon_star_empty.png'),
    gear: gameAsset('ui/icons/ui_icon_gear.png'),
  },
} as const;

export function getUnitArt(params: { unitId?: string; classId?: string }): UnitArt {
  if (params.unitId && unitArtByUnitId[params.unitId]) {
    return unitArtByUnitId[params.unitId];
  }
  if (params.classId && unitArtByClassId[params.classId]) {
    return unitArtByClassId[params.classId];
  }
  return unitArtByKey.alto;
}
