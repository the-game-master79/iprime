const CACHE_NAME = 'cloudforex-v1';
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
          if (key !== STATIC_CACHE && key !== DYNAMIC_CACHE) {
            return caches.delete(key);
          }
        })
      );
    })
  );
});

self.addEventListener('fetch', (event) => {
  // Skip non-GET/non-HTTP requests
  if (event.request.method !== 'GET' || !event.request.url.startsWith('http')) {
    return;
  }

  const url = new URL(event.request.url);
  
  // Cache-first for static assets
  if (STATIC_ASSETS.includes(url.pathname)) {
    event.respondWith(cacheFirst(event.request));
    return;
  }

  // Network-first for API calls
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  // Stale-while-revalidate for everything else
  event.respondWith(staleWhileRevalidate(event.request));
});

// Optimized cache strategies
async function cacheFirst(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);
  return cached || networkFirst(request);
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    const cache = await caches.open(DYNAMIC_CACHE);
    cache.put(request, response.clone());
    return response;
  } catch (error) {
    return caches.match(request);
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(DYNAMIC_CACHE);
  const cached = await cache.match(request);
  
  const networkPromise = fetch(request).then(response => {
    cache.put(request, response.clone());
    return response;
  });

  return cached || networkPromise;
}
