const CACHE_NAME = 'iprime-cache-v1';
const DEV_ORIGIN = 'http://localhost:3000';
const IS_DEVELOPMENT = self.location.hostname === 'localhost';

const urlsToCache = [
  '/',
  '/index.html',
  '/src/main.tsx',
  '/src/App.tsx'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

self.addEventListener('fetch', event => {
  // Skip caching in development mode
  if (IS_DEVELOPMENT && event.request.url.startsWith(DEV_ORIGIN)) {
    event.respondWith(fetch(event.request));
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }

        // For navigation requests, return index.html
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }

        return fetch(event.request).then(fetchResponse => {
          // Don't cache non-success responses
          if (!fetchResponse || fetchResponse.status !== 200) {
            return fetchResponse;
          }

          // Clone the response before caching
          const responseToCache = fetchResponse.clone();
          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseToCache);
            });

          return fetchResponse;
        });
      })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
