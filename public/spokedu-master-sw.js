const STATIC_CACHE = 'spokedu-master-static-v5';
const STORAGE_CACHE = 'spokedu-master-storage-v1';
const CURRENT_CACHES = new Set([STATIC_CACHE, STORAGE_CACHE]);
const MASTER_CACHE_PREFIX = 'spokedu-master';
const PUBLIC_STATIC_PATHS = new Set(['/manifest.json', '/spokedu-master-icon.svg']);
const DISALLOWED_CONTENT_TYPES = ['text/html', 'application/json', 'text/x-component'];

function isAllowedSupabasePublicAsset(url) {
  return (
    url.protocol === 'https:' &&
    url.hostname.endsWith('.supabase.co') &&
    url.pathname.includes('/storage/v1/object/public/iiwarmup-files/') &&
    !url.pathname.includes('/storage/v1/object/sign/') &&
    !url.pathname.includes('/storage/v1/object/authenticated/')
  );
}

function isAllowedSameOriginStatic(url) {
  // /_next/static 은 배포 해시가 바뀌므로 SW cache-first 금지 (ChunkLoadError 방지).
  // hashed asset은 브라우저 HTTP 캐시로 충분하다.
  return url.origin === self.location.origin && PUBLIC_STATIC_PATHS.has(url.pathname);
}

function canStoreResponse(request, response) {
  if (request.method !== 'GET') return false;
  if (!response || !response.ok || response.status !== 200) return false;
  if (response.type !== 'basic' && response.type !== 'cors') return false;

  const cacheControl = response.headers.get('cache-control')?.toLowerCase() ?? '';
  if (cacheControl.includes('no-store') || cacheControl.includes('private')) return false;

  const contentType = response.headers.get('content-type')?.toLowerCase() ?? '';
  return !DISALLOWED_CONTENT_TYPES.some((type) => contentType.includes(type));
}

async function cacheFirst(cacheName, request) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (canStoreResponse(request, response)) {
    await cache.put(request, response.clone());
  }
  return response;
}

async function staleWhileRevalidate(cacheName, request) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const networkFetch = fetch(request).then(async (response) => {
    if (canStoreResponse(request, response)) {
      await cache.put(request, response.clone());
    }
    return response;
  });

  return cached ?? networkFetch;
}

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => Promise.all(
        cacheNames
          .filter((cacheName) => cacheName.startsWith(MASTER_CACHE_PREFIX))
          .filter((cacheName) => !CURRENT_CACHES.has(cacheName))
          .map((cacheName) => caches.delete(cacheName))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  if (request.mode === 'navigate' || request.destination === 'document') return;

  const url = new URL(request.url);
  if (url.origin === self.location.origin) {
    if (url.pathname.startsWith('/api/')) return;
    if (url.pathname.startsWith('/spokedu-master')) return;
    // Never intercept Next hashed bundles — let the network/HTTP cache handle them.
    if (url.pathname.startsWith('/_next/static/')) return;
  }

  if (isAllowedSupabasePublicAsset(url)) {
    event.respondWith(staleWhileRevalidate(STORAGE_CACHE, request));
    return;
  }

  if (isAllowedSameOriginStatic(url)) {
    event.respondWith(cacheFirst(STATIC_CACHE, request));
  }
});
