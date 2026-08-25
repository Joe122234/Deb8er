const CACHE_NAME = 'deb8er-v1';

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      cache.addAll([
        '/',
        '/index.html',
        '/assets/style.min.css',
        '/assets/aos/aos.css',
        '/assets/aos/aos.js',
        '/assets/images/Deb9erfinallogo.webp',
        '/assets/images/icon-192.png',
        '/assets/images/icon-512.png',
        '/assets/images/apple-touch-icon.png',
        '/assets/favicon1.png'
      ])
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== location.origin) return;

  if (url.pathname.startsWith('/assets/') || url.pathname.endsWith('.css') || url.pathname.endsWith('.js')) {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;
        return fetch(request).then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(c => c.put(request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  event.respondWith(
    fetch(request).then(response => {
      if (response.ok && request.headers.get('accept')?.includes('text/html')) {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(c => c.put(request, clone));
      }
      return response;
    }).catch(() => {
      return caches.match(request).then(cached => cached || caches.match('/'));
    })
  );
});
