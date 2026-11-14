const CACHE_NAME = 'nheuflight-shell-v55';
const APP_SHELL = [
  './index.html',
  './style.css?v=8',
  './modern.css?v=22',
  './osiris.css?v=59',
  './data/iata.js?v=50',
  './data/airports.js?v=50',
  './data/initial-planes.js?v=50',
  './dgt-aircraft.js?v=50',
  './classify.js?v=51',
  './nheu-core.js?v=50',
  './nheu-db.js?v=50',
  './nheu-favorites.js?v=50',
  './app-config.js?v=51',
  './app.js?v=55',
  './marine-vessels.js?v=50',
  './marine-tracker.js?v=52',
  './modern.js?v=52',
  './data/cctv-cameras.js?v=50',
  './data/spain-radars.js?v=52',
  './osiris.js?v=59',
  './manifest.json',
  './icon-180.png',
  './icon-192.png',
  './icon-512.png',
];

const shellUrls = new Set(APP_SHELL.map(path => new URL(path, self.registration.scope).href));
const cdnDependencies = new Set([
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://cdn.jsdelivr.net/npm/chart.js',
]);

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(APP_SHELL);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys
      .filter(key => key.startsWith('nheuflight-shell-') && key !== CACHE_NAME)
      .map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  const scope = new URL(self.registration.scope);
  const sameSite = url.origin === scope.origin && url.pathname.startsWith(scope.pathname);
  const isMainPage = request.mode === 'navigate' && sameSite &&
    (url.pathname === scope.pathname || url.pathname === new URL('./index.html', scope).pathname);
  const isShellAsset = shellUrls.has(url.href);
  const isCdnDependency = cdnDependencies.has(url.href);

  if (!isMainPage && !isShellAsset && !isCdnDependency) return;

  const networkFirst = isMainPage || isCdnDependency || !url.searchParams.has('v');
  const cacheKey = isMainPage ? './index.html' : request;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    if (!networkFirst) {
      const cached = await cache.match(cacheKey);
      if (cached) return cached;
    }

    try {
      const response = await fetch(request);
      if (response.ok || response.type === 'opaque') {
        // La respuesta se puede usar mientras se actualiza la copia sin conexión.
        event.waitUntil(cache.put(cacheKey, response.clone()).catch(() => {}));
      } else if (response.status >= 500) {
        const cached = await cache.match(cacheKey);
        if (cached) return cached;
      }
      return response;
    } catch (error) {
      const cached = await cache.match(cacheKey);
      if (cached) return cached;
      throw error;
    }
  })());
});
