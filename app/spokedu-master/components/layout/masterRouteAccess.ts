export type MasterCapability = 'authenticated' | 'library' | 'classTools' | 'records' | 'spomove';

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
  if (pathname === `${basePath}/library` || pathname.startsWith(`${basePath}/library/`)) {
    return { capability: 'library' };
  }
  if (pathname === `${basePath}/class-tools` || pathname.startsWith(`${basePath}/class-tools/`)) {
    return { capability: 'classTools' };
  }
  if (
    pathname === `${basePath}/activity` ||
    pathname.startsWith(`${basePath}/activity/`) ||
    pathname === `${basePath}/class-record` ||
    pathname.startsWith(`${basePath}/class-record/`) ||
    pathname === `${basePath}/students` ||
    pathname.startsWith(`${basePath}/students/`) ||
    pathname === `${basePath}/report` ||
    pathname.startsWith(`${basePath}/report/`)
  ) {
    return { capability: 'records' };
  }
  if (pathname === `${basePath}/spomove` || pathname.startsWith(`${basePath}/spomove/`)) {
    return { capability: 'spomove' };
  }
  return { capability: 'authenticated' };
}

const SAFE_MASTER_RETURN_PREFIXES = [
  '/spokedu-master',
  '/spokedu-master/dashboard',
  '/spokedu-master/library',
  '/spokedu-master/class-tools',
  '/spokedu-master/class-record',
  '/spokedu-master/students',
  '/spokedu-master/report',
  '/spokedu-master/activity',
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
  'mode',
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
  if (!SAFE_MASTER_RETURN_PREFIXES.some((prefix) => parsed.pathname === prefix || parsed.pathname.startsWith(`${prefix}/`))) {
    return fallback;
  }

  for (const key of BLOCKED_RETURN_QUERY_KEYS) {
    if (parsed.searchParams.has(key)) return parsed.pathname;
  }

  return `${parsed.pathname}${parsed.search}`;
}
