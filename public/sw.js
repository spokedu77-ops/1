/* Legacy root service-worker tombstone.
 *
 * Older builds registered /sw.js with root scope. Browsers keep checking that
 * URL even after the application stops registering it. Serving this tiny
 * static worker lets those registrations remove themselves without routing a
 * missing-file request through Next.js.
 */
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.registration.unregister());
});
