const MASTER_LOGIN_FALLBACK = '/spokedu-master/dashboard';

const BLOCKED_LOGIN_RETURN_KEYS = new Set([
  'authKey',
  'customerKey',
  'paymentKey',
  'orderId',
  'code',
  'token',
]);

export function getSafeMasterLoginReturnPath(
  value: string | null | undefined,
  fallback = MASTER_LOGIN_FALLBACK,
) {
  if (!value || /^\s*(?:https?:|javascript:|data:|\/\/)/i.test(value)) return fallback;

  let parsed: URL;
  try {
    parsed = new URL(value, 'https://spokedu.local');
  } catch {
    return fallback;
  }

  if (parsed.origin !== 'https://spokedu.local') return fallback;
  if (
    parsed.pathname !== '/spokedu-master'
    && !parsed.pathname.startsWith('/spokedu-master/')
  ) {
    return fallback;
  }
  if (
    parsed.pathname === '/spokedu-master/login'
    || parsed.pathname.startsWith('/spokedu-master/auth/')
  ) {
    return fallback;
  }

  for (const key of BLOCKED_LOGIN_RETURN_KEYS) parsed.searchParams.delete(key);
  const query = parsed.searchParams.toString();
  return `${parsed.pathname}${query ? `?${query}` : ''}`;
}

export function buildMasterLoginHref(value: string | null | undefined) {
  const next = getSafeMasterLoginReturnPath(value);
  return `/spokedu-master/login?next=${encodeURIComponent(next)}`;
}
