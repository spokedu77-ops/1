'use client';

import { getToken, getMessaging } from 'firebase/messaging';
import { getApps, initializeApp } from 'firebase/app';
import type { SupabaseClient } from '@supabase/supabase-js';

/** 루트(/) 서빙으로 scope=/ 가 되도록 (iOS/Android 푸시 안정화) */
const SW_URL = '/firebase-messaging-sw.js';

/** 세션당 한 번만 등록 (중복 호출 방지) */
const registeredThisSession = new Set<string>();

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
  // 개발 환경에서는 FCM 비활성화 (성능 향상)
  if (process.env.NODE_ENV === 'development') {
    console.log('[FCM] 개발 환경에서는 비활성화됨');
    return;
  }
  
  if (typeof window === 'undefined' || !hasFirebaseConfig()) {
    console.error('[FCM] 건너뜀: window 없음 또는 Firebase 설정 부족');
    return;
  }
  if (Notification.permission !== 'granted') {
    console.error('[FCM] 건너뜀: Notification.permission =', Notification.permission);
    return;
  }
  if (registeredThisSession.has(userId)) {
    return;
  }

  try {
    let reg = await navigator.serviceWorker.getRegistration('/');
    if (!reg) {
      reg = await navigator.serviceWorker.register(SW_URL, { scope: '/' });
      console.log('[FCM] Service Worker 새로 등록 완료');
    } else {
      console.log('[FCM] Service Worker 이미 등록됨, 재사용');
    }
    await navigator.serviceWorker.ready;

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

    if (!token) {
      console.error('[FCM] getToken 실패: token이 null');
      return;
    }
    console.log('[FCM] 토큰 발급 완료, 길이:', token.length);

    const { error } = await supabase.from('user_fcm_tokens').upsert(
      {
        user_id: userId,
        token,
        device_label: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 100) : null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'token' }
    );

    if (error) {
      console.error('[FCM] Supabase upsert 실패:', error.message, error);
    } else {
      registeredThisSession.add(userId);
      console.log('[FCM] user_fcm_tokens 저장 완료');
    }
  } catch (e) {
    console.error('[FCM] 토큰 등록 실패:', e);
  }
}
