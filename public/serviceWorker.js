const CACHE_VERSION = 'v1.0.0';
const CACHE_NAME = `cloudforex-${CACHE_VERSION}`;
const STATIC_CACHE = 'static-v1';
const DYNAMIC_CACHE = 'dynamic-v1';

// Optimize cache list
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/src/main.tsx',
  '/manifest.json',
  // Add critical CSS/JS
  '/src/styles/critical.css',
  '/src/styles/globals.css'
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
          // Delete any old caches
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  // Immediately claim any clients
  return self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Skip non-GET/non-HTTP requests
  if (event.request.method !== 'GET' || !event.request.url.startsWith('http')) {
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then(cache => {
      return fetch(event.request)
        .then(response => {
          // Update cache with new response
          cache.put(event.request, response.clone());
          return response;
        })
        .catch(() => {
          // Fallback to cache if network fails
          return cache.match(event.request);
        });
    })
  );
});
