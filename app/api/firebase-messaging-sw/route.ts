import { NextResponse } from 'next/server';

const FIREBASE_VERSION = '10.7.0';

export async function GET() {
  const config = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
  };
  const _vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY || '';

  const script = `
importScripts(
  'https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-messaging-compat.js'
);
firebase.initializeApp(${JSON.stringify(config)});
const messaging = firebase.messaging();
messaging.onBackgroundMessage(function(payload) {
  const title = payload.notification?.title || payload.data?.title || '새 메시지';
  const body = payload.notification?.body || payload.data?.body || '';
  const options = {
    body: body,
    icon: '/favicon.ico',
    tag: payload.data?.room_id || 'chat',
    vibrate: [200, 100, 200],
    data: payload.data || {}
  };
  return self.registration.showNotification(title, options);
});
self.addEventListener('notificationclick', function(e) {
  e.notification.close();
  const url = e.notification.data?.room_id ? '/teacher/chat' : '/';
  e.waitUntil(clients.matchAll({ type: 'window' }).then(function(cs) {
    if (cs[0]) cs[0].focus(); else clients.openWindow(url);
  }));
});
`.trim();

  return new NextResponse(script, {
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'public, max-age=86400, immutable',
      'Service-Worker-Allowed': '/',
    },
  });
}
