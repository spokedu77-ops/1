'use client';

import { getToken, getMessaging } from 'firebase/messaging';
import { getApps, initializeApp } from 'firebase/app';
import type { SupabaseClient } from '@supabase/supabase-js';

const SW_URL = '/api/firebase-messaging-sw';

function hasFirebaseConfig(): boolean {
  return !!(
    typeof window !== 'undefined' &&
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID &&
    process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY
  );
}

/**
 * FCM 토큰을 발급받아 Supabase user_fcm_tokens에 저장.
 * 채팅 페이지(선생님/관리자) 마운트 시 1회 호출.
 */
export async function registerFCMTokenIfNeeded(
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  if (typeof window === 'undefined' || !hasFirebaseConfig()) return;
  if (Notification.permission !== 'granted') return;

  try {
    const reg = await navigator.serviceWorker.register(SW_URL, { scope: '/' });
    await reg.update();

    const app = getApps().length ? getApps()[0]! : initializeApp({
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    });

    const messaging = getMessaging(app);
    const token = await getToken(messaging, {
      vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY!,
      serviceWorkerRegistration: reg,
    });

    if (!token) return;

    await supabase.from('user_fcm_tokens').upsert(
      {
        user_id: userId,
        token,
        device_label: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 100) : null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'token' }
    );
  } catch (e) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('FCM token registration skipped or failed:', e);
    }
  }
}
