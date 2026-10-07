const MASTER_LOGIN_FALLBACK = '/spokedu-lab/dashboard';

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

function normalizeLabReturnPath(pathname: string) {
  return pathname.startsWith('/spokedu-lab/')
    ? pathname.replace('/spokedu-lab', '/spokedu-master')
    : pathname;
}

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
  const normalizedPathname = normalizeLabReturnPath(parsed.pathname);
  if (
    !SAFE_MASTER_LOGIN_RETURN_EXACT.has(normalizedPathname)
    && !SAFE_MASTER_LOGIN_RETURN_PREFIXES.some(
      (prefix) => normalizedPathname === prefix || normalizedPathname.startsWith(`${prefix}/`),
    )
  ) {
    return fallback;
  }
  if (
    normalizedPathname === '/spokedu-master/login'
    || normalizedPathname.startsWith('/spokedu-master/auth/')
  ) {
    return fallback;
  }

  for (const key of BLOCKED_LOGIN_RETURN_KEYS) parsed.searchParams.delete(key);
  const query = parsed.searchParams.toString();
  return `${parsed.pathname}${query ? `?${query}` : ''}`;
}

export function buildMasterLoginHref(value: string | null | undefined) {
  const next = getSafeMasterLoginReturnPath(value);
  const loginPath = next.startsWith('/spokedu-lab/') ? '/spokedu-lab/login' : '/spokedu-master/login';
  return `${loginPath}?next=${encodeURIComponent(next)}`;
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
  const onboardingPath = safeNext.startsWith('/spokedu-lab/')
    ? '/spokedu-lab/onboarding'
    : '/spokedu-master/onboarding';
  return access.onboardingDone
    ? safeNext
    : `${onboardingPath}?next=${encodeURIComponent(safeNext)}`;
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
