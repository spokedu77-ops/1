const KEEP_LOGGED_IN_KEY = 'spokedu:keep-logged-in';
const EPHEMERAL_SESSION_KEY = 'spokedu:ephemeral-session-active';
const EPHEMERAL_TAB_COUNT_KEY = 'spokedu:ephemeral-tab-count';
const TAB_REGISTERED_KEY = 'spokedu:tab-registered';

function parseTabCount(raw: string | null): number {
  const value = Number.parseInt(raw ?? '', 10);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

/** localStorage에 저장된 "로그인 유지" 기본값 (없으면 true) */
export function readKeepLoggedInPreference(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return localStorage.getItem(KEEP_LOGGED_IN_KEY) !== '0';
  } catch {
    return true;
  }
}

function clearEphemeralBrowserSessionMarkers(): void {
  localStorage.removeItem(EPHEMERAL_SESSION_KEY);
  localStorage.removeItem(EPHEMERAL_TAB_COUNT_KEY);
  sessionStorage.removeItem(TAB_REGISTERED_KEY);
}

/** 로그인 성공 직후 호출 — 유지 여부를 저장하고 브라우저 세션 마커를 갱신 */
export function applyLoginSessionPreference(keepLoggedIn: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(KEEP_LOGGED_IN_KEY, keepLoggedIn ? '1' : '0');
    if (keepLoggedIn) {
      clearEphemeralBrowserSessionMarkers();
      return;
    }
    localStorage.setItem(EPHEMERAL_SESSION_KEY, '1');
    if (sessionStorage.getItem(TAB_REGISTERED_KEY) !== '1') {
      sessionStorage.setItem(TAB_REGISTERED_KEY, '1');
      localStorage.setItem(EPHEMERAL_TAB_COUNT_KEY, String(parseTabCount(localStorage.getItem(EPHEMERAL_TAB_COUNT_KEY)) + 1));
    }
  } catch {
    // storage 불가 환경은 기본 쿠키 동작에 맡김
  }
}

/** 로그아웃 시 세션 마커 정리 */
export function clearLoginSessionMarkers(): void {
  if (typeof window === 'undefined') return;
  try {
    clearEphemeralBrowserSessionMarkers();
  } catch {
    // ignore
  }
}

/**
 * "로그인 유지" 해제 시: 브라우저 창(탭)을 모두 닫았다가 다시 열면
 * ephemeral 마커가 사라지므로 남아 있는 쿠키 세션을 signOut으로 정리한다.
 * 탭 간에는 localStorage 마커를 공유해 새 탭에서도 로그인을 유지한다.
 * @returns true if signed out
 */
export async function enforceSessionOnlyPolicy(
  signOut: () => Promise<unknown>,
): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  try {
    if (localStorage.getItem(KEEP_LOGGED_IN_KEY) !== '0') return false;
    if (localStorage.getItem(EPHEMERAL_SESSION_KEY) === '1') return false;
    await signOut();
    return true;
  } catch {
    return false;
  }
}

/**
 * ephemeral(로그인 유지 OFF) 세션의 열린 탭 수를 추적한다.
 * 마지막 탭이 닫히면 ephemeral 마커를 제거해, 다음 브라우저 실행 시 signOut되게 한다.
 */
export function registerEphemeralBrowserSession(): () => void {
  if (typeof window === 'undefined') return () => undefined;

  if (readKeepLoggedInPreference()) return () => undefined;
  if (localStorage.getItem(EPHEMERAL_SESSION_KEY) !== '1') return () => undefined;

  try {
    if (sessionStorage.getItem(TAB_REGISTERED_KEY) !== '1') {
      sessionStorage.setItem(TAB_REGISTERED_KEY, '1');
      localStorage.setItem(
        EPHEMERAL_TAB_COUNT_KEY,
        String(parseTabCount(localStorage.getItem(EPHEMERAL_TAB_COUNT_KEY)) + 1),
      );
    }
  } catch {
    return () => undefined;
  }

  const releaseTab = () => {
    try {
      if (sessionStorage.getItem(TAB_REGISTERED_KEY) !== '1') return;
      sessionStorage.removeItem(TAB_REGISTERED_KEY);

      const nextCount = parseTabCount(localStorage.getItem(EPHEMERAL_TAB_COUNT_KEY)) - 1;
      if (nextCount <= 0) {
        clearEphemeralBrowserSessionMarkers();
        return;
      }
      localStorage.setItem(EPHEMERAL_TAB_COUNT_KEY, String(nextCount));
    } catch {
      // ignore
    }
  };

  window.addEventListener('pagehide', releaseTab);
  return () => window.removeEventListener('pagehide', releaseTab);
}
