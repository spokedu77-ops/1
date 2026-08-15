/* SPOKEDU MASTER service-worker tombstone.
 *
 * A previously installed worker can outlive a deployment and leave a browser
 * unable to navigate within /spokedu-master/. Keep this URL available so old
 * registrations update to this worker, clear MASTER-owned caches, and remove
 * themselves. The application is online-first and does not require a worker.
 */

const MASTER_CACHE_PREFIX = 'spokedu-master';

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => Promise.all(
        cacheNames
          .filter((cacheName) => cacheName.startsWith(MASTER_CACHE_PREFIX))
          .map((cacheName) => caches.delete(cacheName)),
      ))
      .then(() => self.registration.unregister())
      .then(() => self.clients.claim()),
  );
});

// Intentionally no fetch handler: every request goes directly to the network.
