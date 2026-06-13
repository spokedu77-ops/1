const CACHE_NAME = 'spokedu-master-v3';
const STORAGE_CACHE = 'spokedu-master-storage-v1';
const APP_SHELL = [
  '/spokedu-master',
  '/spokedu-master/dashboard',
  '/spokedu-master/library',
  '/spokedu-master/spomove',
  '/spokedu-master/class-record',
  '/manifest.json',
  '/spokedu-master-icon.svg',
];

function isSupabaseIiwarmupPublicAsset(url) {
  return (
    url.hostname.endsWith('.supabase.co') &&
    url.pathname.includes('/storage/v1/object/public/iiwarmup-files/')
  );
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key !== CACHE_NAME && key !== STORAGE_CACHE).map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  if (isSupabaseIiwarmupPublicAsset(url)) {
    event.respondWith(
      caches.open(STORAGE_CACHE).then((cache) =>
        cache.match(request).then((cached) => {
          const networkFetch = fetch(request).then((response) => {
            if (response.ok) {
              cache.put(request, response.clone());
            }
            return response;
          });
          if (cached) {
            void networkFetch;
            return cached;
          }
          return networkFetch;
        })
      )
    );
    return;
  }

  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request).then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        return response;
      }))
    );
    return;
  }

  if (url.pathname.startsWith('/spokedu-master')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match('/spokedu-master')))
    );
  }
});
