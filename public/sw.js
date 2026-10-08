// Lactis Dairy Farm OS - Service Worker
const CACHE_NAME = 'lactis-pwa-v1';
const STATIC_ASSETS = [
  '/',
  '/login',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/logo.svg',
  '/favicon.ico'
];

// Install Event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('SW static cache warmup note:', err);
      });
    })
  );
  self.skipWaiting();
});

// Activate Event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event (Network-First with Cache Fallback for navigation and static assets)
self.addEventListener('fetch', (event) => {
  const request = event.request;
  
  // Do not intercept non-GET or API/Auth requests
  if (
    request.method !== 'GET' ||
    request.url.includes('/api/') ||
    request.url.includes('/auth/') ||
    request.url.includes('supabase.co')
  ) {
    return;
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        // Clone and cache valid responses for static assets
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache).catch(() => {});
          });
        }
        return response;
      })
      .catch(async () => {
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
          return cachedResponse;
        }
        // Fallback for HTML navigations
        if (request.headers.get('accept')?.includes('text/html')) {
          return caches.match('/login') || caches.match('/');
        }
      })
  );
});
