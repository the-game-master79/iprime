const CACHE_NAME = 'cloudforex-v1';
const STATIC_CACHE = 'static-v1';
const DYNAMIC_CACHE = 'dynamic-v1';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/src/main.tsx',
  '/manifest.json',
  'https://acvzuxvssuovhiwtdmtj.supabase.co/storage/v1/object/public/images-public//favicon-32x32.png',
  'https://acvzuxvssuovhiwtdmtj.supabase.co/storage/v1/object/public/images-public//favicon-16x16.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== STATIC_CACHE && key !== DYNAMIC_CACHE) {
            return caches.delete(key);
          }
        })
      );
    })
  );
});

self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    event.respondWith(fetch(event.request));
    return;
  }

  // Custom caching strategies based on request type
  if (event.request.url.includes('hcaptcha.com')) {
    // Network first for hCaptcha
    event.respondWith(
      fetch(event.request)
        .catch(() => caches.match(event.request))
    );
    return;
  }

  if (event.request.url.includes('vercel')) {
    // Cache first for Vercel scripts
    event.respondWith(
      caches.match(event.request)
        .then(response => {
          return response || fetch(event.request)
            .then(fetchRes => {
              return caches.open(STATIC_CACHE)
                .then(cache => {
                  cache.put(event.request.url, fetchRes.clone());
                  return fetchRes;
                });
            });
        })
    );
    return;
  }

  // Default stale-while-revalidate strategy
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        const fetchPromise = fetch(event.request)
          .then(networkResponse => {
            if (networkResponse.ok) {
              const responseToCache = networkResponse.clone();
              caches.open(DYNAMIC_CACHE)
                .then(cache => cache.put(event.request, responseToCache));
            }
            return networkResponse;
          });
        return cachedResponse || fetchPromise;
      })
  );
});
