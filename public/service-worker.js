const CACHE_NAME = 'eight-wardens-shell-v9-game-assets';
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/service-worker.js',
  '/sw.js',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable-512.png',
  '/assets/backgrounds/title-vista.svg',
  '/assets/backgrounds/world-map.svg',
  '/assets/backgrounds/field-line.svg',
  '/assets/ui/crest.svg',
  '/assets/generated/title-background.png',
  '/assets/generated/map-background.png',
  '/assets/generated/battle-background.png',
  '/assets/generated/unit-portraits-sheet.png',
  '/assets/generated/warden-chibi-sheet.png',
  '/assets/generated/enemy-chibi-sheet.png',
  '/assets/generated/map-marker-sheet.png',
  '/assets/generated/unit-portraits-sheet-transparent.png',
  '/assets/generated/warden-chibi-sheet-transparent.png',
  '/assets/generated/enemy-chibi-sheet-transparent.png',
  '/assets/generated/map-marker-sheet-transparent.png',
  '/assets/game/backgrounds/chapter1_world_map.png',
  '/assets/game/backgrounds/battle_village_gate_day.png',
  '/assets/game/backgrounds/result_stage_clear_bg.png',
  '/assets/game/banners/banner_wave_start.png',
  '/assets/game/banners/banner_elite_warning.png',
  '/assets/game/banners/banner_boss_warning.png',
  '/assets/game/banners/banner_stage_clear.png',
  '/assets/game/banners/deco_victory_flourish_gold.png',
  '/assets/game/banners/deco_reward_sparkle_gold.png',
  '/assets/game/banners/deco_three_star_clear.png',
  '/assets/game/effects/fx_slash_blue.png',
  '/assets/game/effects/fx_hit_flash_orange.png',
  '/assets/game/effects/fx_magic_bolt_purple.png',
  '/assets/game/effects/fx_target_ring_red.png',
  '/assets/game/effects/fx_route_curve_red.png',
  '/assets/game/effects/fx_route_dotted_red.png',
  '/assets/game/effects/fx_route_lane_warning_red.png',
  '/assets/game/ui/icons/ui_icon_coin.png',
  '/assets/game/ui/icons/ui_icon_gem.png',
  '/assets/game/ui/icons/ui_icon_lock.png',
  '/assets/game/ui/icons/ui_icon_shield.png',
  '/assets/game/ui/icons/ui_icon_sword.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.map((key) => (key === CACHE_NAME ? Promise.resolve(false) : caches.delete(key)))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return;
  }

  const requestUrl = new URL(event.request.url);
  const isSameOrigin = requestUrl.origin === self.location.origin;
  const isNavigation = event.request.mode === 'navigate';
  const isHashedBuildAsset = requestUrl.pathname.startsWith('/assets/') && /\.[a-f0-9]{8,}\./.test(requestUrl.pathname);

  if (isNavigation || (isSameOrigin && !isHashedBuildAsset)) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => caches.match(event.request).then((cached) => cached ?? caches.match('/index.html'))),
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => cached ?? fetch(event.request).then((response) => {
      if (response.ok && isSameOrigin) {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
      }
      return response;
    })),
  );
});
