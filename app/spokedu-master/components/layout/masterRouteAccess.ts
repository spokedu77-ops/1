export type MasterCapability = 'authenticated' | 'library' | 'classTools' | 'attendance' | 'records' | 'spomove';

export type MasterRouteRequirement = {
  capability: MasterCapability;
};

export function isProtectedMasterRoute(pathname: string, basePath: string) {
  if (basePath.startsWith('/admin')) return false;

  const publicRoutes = [
    `${basePath}/landing`,
    `${basePath}/terms`,
    `${basePath}/privacy`,
    `${basePath}/parent`,
    `${basePath}/payment`,
  ];
  if (publicRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`))) {
    return false;
  }
  return pathname === basePath || pathname.startsWith(`${basePath}/`);
}

export function getMasterRouteRequirement(pathname: string, basePath = '/spokedu-master'): MasterRouteRequirement {
  if (
    pathname === `${basePath}/spomove/session` ||
    pathname.startsWith(`${basePath}/spomove/session/`)
  ) {
    return { capability: 'spomove' };
  }
  if (
    pathname === `${basePath}/programs` ||
    pathname.startsWith(`${basePath}/programs/`) ||
    pathname === `${basePath}/favorites` ||
    pathname.startsWith(`${basePath}/favorites/`) ||
    pathname === `${basePath}/spomove` ||
    pathname.startsWith(`${basePath}/spomove/`)
  ) {
    return { capability: 'library' };
  }
  if (pathname === `${basePath}/manage` || pathname.startsWith(`${basePath}/manage/`)) {
    return { capability: 'attendance' };
  }
  if (pathname === `${basePath}/library` || pathname.startsWith(`${basePath}/library/`)) {
    return { capability: 'library' };
  }
  if (pathname === `${basePath}/class-tools` || pathname.startsWith(`${basePath}/class-tools/`)) {
    return { capability: 'classTools' };
  }
  if (
    pathname === `${basePath}/activity` ||
    pathname.startsWith(`${basePath}/activity/`) ||
    pathname === `${basePath}/classes` ||
    pathname.startsWith(`${basePath}/classes/`) ||
    pathname === `${basePath}/students`
  ) {
    return { capability: 'attendance' };
  }
  if (
    pathname === `${basePath}/class-record` ||
    pathname.startsWith(`${basePath}/class-record/`) ||
    pathname.startsWith(`${basePath}/students/`) ||
    pathname === `${basePath}/report` ||
    pathname.startsWith(`${basePath}/report/`)
  ) {
    return { capability: 'records' };
  }
  return { capability: 'authenticated' };
}

const SAFE_MASTER_RETURN_EXACT = new Set(['/spokedu-master']);

const SAFE_MASTER_RETURN_PREFIXES = [
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
];

const BLOCKED_RETURN_QUERY_KEYS = new Set([
  'authKey',
  'customerKey',
  'paymentKey',
  'orderId',
  'plan',
]);

export function getSafeMasterReturnPath(value: string | null | undefined, fallback = '/spokedu-master/dashboard') {
  if (!value) return fallback;
  if (/^\s*(https?:|javascript:|data:|\/\/)/i.test(value)) return fallback;

  let parsed: URL;
  try {
    parsed = new URL(value, 'https://spokedu.local');
  } catch {
    return fallback;
  }

  if (parsed.origin !== 'https://spokedu.local') return fallback;
  if (!parsed.pathname.startsWith('/spokedu-master')) return fallback;
  if (parsed.pathname.startsWith('/spokedu-master/class-mode')) return fallback;
  if (
    !SAFE_MASTER_RETURN_EXACT.has(parsed.pathname) &&
    !SAFE_MASTER_RETURN_PREFIXES.some((prefix) => parsed.pathname === prefix || parsed.pathname.startsWith(`${prefix}/`))
  ) {
    return fallback;
  }

  for (const key of BLOCKED_RETURN_QUERY_KEYS) {
    parsed.searchParams.delete(key);
  }

  const query = parsed.searchParams.toString();
  return `${parsed.pathname}${query ? `?${query}` : ''}`;
}
