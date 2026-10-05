import { clearAdminCheckCache } from '@/app/lib/auth/adminCheckCache';
import { clearLoginSessionMarkers } from '@/app/lib/auth/sessionPersistence';
import { clearBrowserSupabaseAuthCookies } from '@/app/lib/auth/supabaseAuthCookie';
import { getSupabaseBrowserClient } from '@/app/lib/supabase/browser';
import { SPOKEDU_PATHS } from '@/app/spokedu/data/public-routes';

const LOGOUT_CHANNEL = 'spokedu:auth-logout';

let logoutInProgress = false;

function publishLogoutToOtherTabs(): void {
  if (typeof BroadcastChannel === 'undefined') return;
  const channel = new BroadcastChannel(LOGOUT_CHANNEL);
  channel.postMessage({ type: 'logout' });
  channel.close();
}

function redirectAfterForeignLogout(): void {
  const path = window.location.pathname;
  if (path.startsWith('/admin') || path.startsWith('/teacher') || path.startsWith('/portal')) {
    window.location.replace('/login');
    return;
  }
  if (path === '/login' || path.startsWith('/spokedu-master/login') || path === '/spokedu-master/landing') {
    window.location.reload();
    return;
  }
  if (path.startsWith('/spokedu-master')) {
    window.location.replace(SPOKEDU_PATHS.subscription);
  }
}

async function clearLocalAuthState(): Promise<void> {
  clearAdminCheckCache();
  clearLoginSessionMarkers();
  try {
    await getSupabaseBrowserClient().auth.signOut({ scope: 'local' });
  } catch {
    // 쿠키 삭제로 이어서 끊는다.
  }
  clearBrowserSupabaseAuthCookies();
}

/** 다른 탭에 남아 있는 스포무브·관리자 화면이 쿠키를 다시 쓰지 못하게 한다. */
export function subscribeToLogoutFromOtherTabs(): () => void {
  if (typeof BroadcastChannel === 'undefined') return () => undefined;
  const channel = new BroadcastChannel(LOGOUT_CHANNEL);
  const onMessage = () => {
    if (logoutInProgress) return;
    void clearLocalAuthState().finally(redirectAfterForeignLogout);
  };
  channel.addEventListener('message', onMessage);
  return () => {
    channel.removeEventListener('message', onMessage);
    channel.close();
  };
}

/**
 * 이 브라우저의 로그인 세션을 끊는다.
 * 스포무브와 관리자는 같은 Supabase 쿠키를 쓰므로, 한쪽만 메모리에서 지우면 다른 쪽이 쿠키를 되살린다.
 */
export async function logoutCurrentSession(): Promise<void> {
  logoutInProgress = true;
  clearAdminCheckCache();
  clearLoginSessionMarkers();
  try {
    await getSupabaseBrowserClient().auth.signOut({ scope: 'global' });
  } catch {
    try {
      await getSupabaseBrowserClient().auth.signOut({ scope: 'local' });
    } catch {
      // 서버 라우트가 쿠키를 만료시킨다.
    }
  }
  clearBrowserSupabaseAuthCookies();
  publishLogoutToOtherTabs();
  try {
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
      cache: 'no-store',
    });
  } catch {
    // 브라우저 쿠키는 이미 지웠다.
  }
  clearBrowserSupabaseAuthCookies();
  clearAdminCheckCache();
}
