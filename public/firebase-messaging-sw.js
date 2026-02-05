/* Service Worker: 루트(/) 서빙, config는 /firebase-messaging-config.js에서 로드 */
/* eslint-disable no-undef */
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');
importScripts('/firebase-messaging-config.js');

if (typeof self.__FIREBASE_CONFIG__ !== 'undefined' && self.__FIREBASE_CONFIG__?.projectId) {
  firebase.initializeApp(self.__FIREBASE_CONFIG__);
  const messaging = firebase.messaging();

  messaging.onBackgroundMessage(function(payload) {
    const title = payload?.notification?.title || payload?.data?.title || '새 메시지';
    const body = payload?.notification?.body || payload?.data?.body || '';
    const url = payload?.data?.url || '/teacher/chat';
    const options = {
      body: body,
      icon: '/favicon.ico',
      tag: payload?.data?.room_id || 'chat',
      vibrate: [200, 100, 200],
      data: { url: url, ...(payload?.data || {}) },
    };
    return self.registration.showNotification(title, options);
  });
}

self.addEventListener('notificationclick', function(e) {
  e.notification.close();
  const url = e.notification?.data?.url || '/teacher/chat';

  e.waitUntil((async function() {
    const allClients = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    const existing = allClients.find(function(c) { return 'focus' in c; });

    if (existing) {
      await existing.focus();
      if ('navigate' in existing) existing.navigate(url);
      else await clients.openWindow(url);
    } else {
      await clients.openWindow(url);
    }
  })());
});

self.addEventListener('install', function() { self.skipWaiting(); });
self.addEventListener('activate', function() { self.clients.claim(); });
