// Service Worker for Life Story + Diagram App
// Caches all app assets for full offline operation

const CACHE_NAME = 'Life Story + Diagram-app-v10';

// List ALL files the app needs to run offline.
// NOTE: Do NOT include './' (the directory root) — many servers redirect it,
// which causes cache.add() to fail with "Request failed".
// The start_url (./working-ecoMap-2.html) is cached explicitly below.
const ASSETS_TO_CACHE = [
  './working-ecoMap-2.html',
  './voice-recorder.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './Guide.pdf'
];

function cacheResponse(request, response) {
  if (!response || response.status !== 200 || response.type !== 'basic') return response;
  const responseToCache = response.clone();
  caches.open(CACHE_NAME).then((cache) => {
    cache.put(request, responseToCache);
  });
  return response;
}

function networkFirst(request) {
  return fetch(request)
    .then((response) => cacheResponse(request, response))
    .catch(() => {
      return caches.match(request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;
        return new Response('Offline — please check your connection.', {
          status: 503,
          headers: { 'Content-Type': 'text/plain' }
        });
      });
    });
}

// Install: pre-cache all assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Pre-caching app assets');
      // Cache each asset individually so one failure doesn't abort the whole install
      return Promise.allSettled(
        ASSETS_TO_CACHE.map(url =>
          cache.add(url).catch(err => console.warn('[SW] Failed to cache', url, err))
        )
      );
    }).then(() => {
      // Activate immediately (don't wait for old SW to finish)
      return self.skipWaiting();
    })
  );
});

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => {
      // Take control of all pages immediately
      return self.clients.claim();
    })
  );
});

// Fetch: serve from cache first, fall back to network
// This ensures the app works fully offline once installed
self.addEventListener('fetch', (event) => {
  // Only handle GET requests (ignore POST to api/validate.php etc.)
  if (event.request.method !== 'GET') return;

  // Skip requests to the API (serial validation happens online before install)
  const url = new URL(event.request.url);
  if (url.pathname.includes('/api/')) return;

  // Skip requests to external domains (PayPal, analytics, etc.)
  if (url.origin !== self.location.origin) return;

  const isDocumentRequest =
    event.request.mode === 'navigate' ||
    event.request.destination === 'document' ||
    url.pathname.endsWith('.html');
  const isManifestRequest = url.pathname.endsWith('/manifest.json') || url.pathname.endsWith('manifest.json');

  if (isDocumentRequest || isManifestRequest) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Serve from cache (instant, offline-safe)
        return cachedResponse;
      }
      // Not in cache: try network, then cache the response for future offline use
      return fetch(event.request).then((networkResponse) => {
        return cacheResponse(event.request, networkResponse);
      }).catch(() => {
        // Network failed and not in cache — return a simple offline message
        // (This should rarely happen since we pre-cache everything)
        return new Response('Offline — please check your connection.', {
          status: 503,
          headers: { 'Content-Type': 'text/plain' }
        });
      });
    })
  );
});
