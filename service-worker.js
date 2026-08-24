const CACHE = 'mallmaze-static-v16';

const ASSETS = [
  '/',
  '/index.html',
  '/malls.html',
  '/mall.html',
  '/products.html',
  '/product.html',
  '/compare.html',
  '/autoshelf.html',
  '/store.html',
  '/cart.html',
  '/orders.html',
  '/order.html',
  '/checkout-success.html',
  '/notifications.html',
  '/support.html',
  '/scan.html',
  '/scan-receipt.html',
  '/verify-receipt.html',
  '/sw-reset.html',
  '/offline.html',
  '/assets/js/main.js?v=connect-os-20260519-2',
  '/assets/js/qr.js',
  '/assets/js/runtime-guard.js',
  '/assets/js/config.js',
  '/assets/css/tailwind.css',
  '/assets/css/react-styles.css?v=connect-os-20260519-2'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.map((k) => (k === CACHE ? null : caches.delete(k)))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const isSameOrigin = url.origin === self.location.origin;
  const shouldPreferNetwork = req.mode === 'navigate' || (isSameOrigin && ['script', 'style'].includes(req.destination));

  if (shouldPreferNetwork) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          if (isSameOrigin) caches.open(CACHE).then((cache) => cache.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(async () => {
          const cached = await caches.match(req);
          if (cached) return cached;
          if (req.mode === 'navigate') {
            const offline = await caches.match('/offline.html');
            if (offline) return offline;
          }
          throw new Error('Network request failed and no cache entry exists.');
        })
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((res) => {
          const copy = res.clone();
          // Only cache same-origin GETs to avoid caching opaque cross-origin responses.
          if (isSameOrigin) caches.open(CACHE).then((cache) => cache.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(async () => {
          // Offline fallback for navigations
          if (req.mode === 'navigate') {
            const offline = await caches.match('/offline.html');
            if (offline) return offline;
          }
          return cached;
        });
    })
  );
});
