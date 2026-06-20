// ═══════════════════════════════════════════════════════
//  Noor al-Shahadah — Service Worker v1.0
//  Full offline caching for Muharram & Arbaeen use
// ═══════════════════════════════════════════════════════

const CACHE_NAME = 'noor-al-shahadah-v1';
const OFFLINE_URL = './index.html';

const PRECACHE_ASSETS = [
  './index.html',
  './manifest.json',
  './icon-192.svg',
  './icon-512.svg',
  // Google Fonts — cached on first load
];

// ── INSTALL: pre-cache core assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW] Pre-caching core assets');
      return cache.addAll(PRECACHE_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// ── ACTIVATE: clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => {
          console.log('[SW] Deleting old cache:', k);
          return caches.delete(k);
        })
      )
    ).then(() => self.clients.claim())
  );
});

// ── FETCH: cache-first with network fallback
self.addEventListener('fetch', event => {
  const { request } = event;

  // Skip non-GET and cross-origin (except fonts)
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  const isFont = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  const isSameOrigin = url.origin === self.location.origin;

  if (!isSameOrigin && !isFont) return;

  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) {
        // Serve from cache, update in background
        const networkFetch = fetch(request).then(response => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(c => c.put(request, clone));
          }
          return response;
        }).catch(() => null);

        return cached;
      }

      // Not in cache — fetch from network and cache
      return fetch(request).then(response => {
        if (!response || response.status !== 200 || response.type === 'opaque') {
          return response;
        }
        const clone = response.clone();
        caches.open(CACHE_NAME).then(c => c.put(request, clone));
        return response;
      }).catch(() => {
        // Offline fallback
        if (request.destination === 'document') {
          return caches.match(OFFLINE_URL);
        }
      });
    })
  );
});

// ── BACKGROUND SYNC (for bookmarks)
self.addEventListener('sync', event => {
  if (event.tag === 'sync-bookmarks') {
    console.log('[SW] Background sync: bookmarks');
  }
});

// ── PUSH NOTIFICATIONS (for Muharram reminders)
self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'نور الشهادة';
  const options = {
    body: data.body || 'اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ وَآلِ مُحَمَّدٍ',
    icon: './icon-192.svg',
    badge: './icon-192.svg',
    dir: 'rtl',
    lang: 'ar',
    vibrate: [100, 50, 100],
    data: { url: data.url || './' }
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url || './')
  );
});

console.log('[SW] Noor al-Shahadah Service Worker loaded ✓');
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url || './')
  );
});

console.log('[SW] Noor al-Shahadah Service Worker loaded ✓');
