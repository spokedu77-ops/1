type LoginUxEvent =
  | 'auto_redirect_from_login'
  | 'ephemeral_session_cleared'
  | 'login_tab_selected';

type LoginUxPayload = {
  event: LoginUxEvent;
  pathname?: string | null;
  redirectPath?: string | null;
  activeTab?: string | null;
};

export function reportLoginUxEvent(
  event: LoginUxEvent,
  details?: Omit<LoginUxPayload, 'event'>,
): void {
  if (typeof window === 'undefined') return;

  const payload: LoginUxPayload = {
    event,
    pathname: details?.pathname ?? window.location.pathname,
    redirectPath: details?.redirectPath ?? null,
    activeTab: details?.activeTab ?? null,
  };

  const body = JSON.stringify(payload);

  try {
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      const blob = new Blob([body], { type: 'application/json' });
      navigator.sendBeacon('/api/auth/login-ux', blob);
      return;
    }
  } catch {
    // fall through to fetch
  }

  void fetch('/api/auth/login-ux', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    cache: 'no-store',
    keepalive: true,
  }).catch(() => {
    // telemetry must never break UX
  });
}
