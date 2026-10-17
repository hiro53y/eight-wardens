const CACHE_NAME = 'eight-wardens-shell-v13-landmarks-motion';
// 遊ぶのに要る物だけ先に入れる（絵は WebP の軽量版。BGM は流す時に読む）
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable-512.png',
  '/assets/v32/alto.webp',
  '/assets/v32/battle1.webp',
  '/assets/v32/battle2.webp',
  '/assets/v32/battle3.webp',
  '/assets/v32/battle4.webp',
  '/assets/v32/battle5.webp',
  '/assets/v32/greta.webp',
  '/assets/v32/iris.webp',
  '/assets/v32/kai.webp',
  '/assets/v32/lyca.webp',
  '/assets/v32/map1.webp',
  '/assets/v32/map2.webp',
  '/assets/v32/map3.webp',
  '/assets/v32/map4.webp',
  '/assets/v32/map5.webp',
  '/assets/v32/minato.webp',
  '/assets/v32/sena.webp',
  '/assets/v32/shino.webp',
  '/assets/v2/battle.webp',
  '/assets/v2/map.webp',
  '/assets/v2/title.webp',
  '/assets/v2/result.webp',
  '/assets/v2/wardens.webp',
  '/assets/v2/enemies.webp',
  '/assets/v31/iris.webp',
  '/assets/v31/sena.webp',
  '/assets/v31/shield_goblin.webp',
  '/assets/v31/shaman.webp',
  '/assets/v31/orc_lord.webp',
  '/assets/v31/worm_king.webp',
  '/assets/v31/battle_forest.webp',
  '/assets/v31/battle_canyon.webp',
  '/assets/v31/battle_desert.webp',
  '/assets/v31/battle_abyss.webp',
  '/assets/v31/portraits.webp',
  '/assets/v2/enemy_goblin.webp',
  '/assets/v2/enemy_orc.webp',
  '/assets/v2/enemy_wolf_elite.webp',
  '/assets/v2/enemy_wingbat.webp',
  '/assets/v2/banner_wave.webp',
  '/assets/v2/banner_boss.webp',
  '/assets/v2/banner_elite.webp',
  '/assets/v2/banner_clear.webp',
  '/assets/v2/deco_stars.webp',
  '/assets/v2/fx_slash.webp',
  '/assets/v2/fx_hit.webp',
  '/assets/v2/fx_magic.webp',
  '/assets/v2/fx_buff.webp',
  '/assets/v2/fx_heal.webp',
  '/assets/v2/fx_sparkle.webp',
  '/assets/v2/fx_target.webp',
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
  // 音（範囲の読み込み）はキャッシュに入れない
  if (event.request.headers.has('range') || /\.mp3$/.test(requestUrl.pathname)) {
    return;
  }
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
