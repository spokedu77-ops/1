const MASTER_LOGIN_FALLBACK = '/spokedu-master/dashboard';

const BLOCKED_LOGIN_RETURN_KEYS = new Set([
  'authKey',
  'customerKey',
  'paymentKey',
  'orderId',
  'code',
  'token',
  'plan',
]);

const SAFE_MASTER_LOGIN_RETURN_EXACT = new Set(['/spokedu-master']);

const SAFE_MASTER_LOGIN_RETURN_PREFIXES = [
  '/spokedu-master/dashboard',
  '/spokedu-master/programs',
  '/spokedu-master/favorites',
  '/spokedu-master/manage',
  '/spokedu-master/library',
  '/spokedu-master/class-tools',
  '/spokedu-master/class-record',
  '/spokedu-master/students',
  '/spokedu-master/report',
  '/spokedu-master/activity',
  '/spokedu-master/classes',
  '/spokedu-master/spomove',
  '/spokedu-master/profile',
  '/spokedu-master/subscription',
  '/spokedu-master/payment',
  '/spokedu-master/onboarding',
  '/spokedu-master/shop',
  '/spokedu-master/terms',
  '/spokedu-master/privacy',
  '/spokedu-master/parent',
] as const;

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
    !SAFE_MASTER_LOGIN_RETURN_EXACT.has(parsed.pathname)
    && !SAFE_MASTER_LOGIN_RETURN_PREFIXES.some(
      (prefix) => parsed.pathname === prefix || parsed.pathname.startsWith(`${prefix}/`),
    )
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

export type MasterEntryAccess = {
  authenticated: true;
  onboardingDone: boolean;
  isAdmin: boolean;
};

export type MasterEntryDecision = {
  destination: string | null;
  clearBrowserSession: boolean;
};

export function resolveMasterEntryDestination(
  access: MasterEntryAccess,
  next: string,
) {
  const safeNext = getSafeMasterLoginReturnPath(next);
  return access.onboardingDone
    ? safeNext
    : `/spokedu-master/onboarding?next=${encodeURIComponent(safeNext)}`;
}

export function resolveMasterEntryAccess(
  status: number,
  access: MasterEntryAccess | null,
  next: string,
): MasterEntryDecision {
  if (status === 401) {
    return { destination: null, clearBrowserSession: true };
  }
  if (status < 200 || status >= 300 || access?.authenticated !== true) {
    return { destination: null, clearBrowserSession: false };
  }
  return {
    destination: resolveMasterEntryDestination(access, next),
    clearBrowserSession: false,
  };
}
