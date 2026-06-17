const STATIC_CACHE = 'spokedu-master-static-v4';
const STORAGE_CACHE = 'spokedu-master-storage-v1';
const LEGACY_CACHES = ['spokedu-master-v3', 'start-url', 'dev'];
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
  return url.origin === self.location.origin && (
    url.pathname.startsWith('/_next/static/') ||
    PUBLIC_STATIC_PATHS.has(url.pathname)
  );
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
    Promise.all(LEGACY_CACHES.map((cacheName) => caches.delete(cacheName)))
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
  }

  if (isAllowedSupabasePublicAsset(url)) {
    event.respondWith(staleWhileRevalidate(STORAGE_CACHE, request));
    return;
  }

  if (isAllowedSameOriginStatic(url)) {
    event.respondWith(cacheFirst(STATIC_CACHE, request));
  }
});
