/**
 * MASTER navigation / payment context SSOT.
 *
 * Categories (ad-hoc query names outside this map are forbidden for continuity):
 *
 * OBJECT: session, sessionProgram, class, student, program, preset
 * DISCOVERY: view, group, difficulty, movement, q, from
 * WORK: date, create, entry, mode, cueSeconds, sound, rounds, difficulty, tool
 * RETURN: returnTo (Session / work), hubReturn (SPOMOVE exploration)
 * COMMERCIAL: intent / next / journeyId live on Gate/Payment routes, not here
 *
 * Payment (`masterPaymentReturn`) and in-app returns must use the same allowlists.
 */

export const MASTER_CONTEXT_ORIGIN = 'https://spokedu.local';

export function normalizeMasterAppPath(pathname: string) {
  return pathname === '/spokedu-master'
    ? '/spokedu-lab'
    : pathname.replace(/^\/spokedu-master(?=\/)/, '/spokedu-lab');
}

export const MASTER_POST_PAYMENT_QUERY_KEYS: Record<string, readonly string[]> = {
  '/spokedu-lab/library': ['from', 'session', 'sessionProgram', 'returnTo', 'source'],
  '/spokedu-lab/class-record': ['program', 'record'],
  '/spokedu-lab/report': ['session', 'program', 'record'],
  '/spokedu-lab/activity': ['session', 'date', 'create', 'class', 'program', 'record', 'capture'],
  '/spokedu-lab/manage': ['session', 'date', 'create', 'class', 'program', 'record', 'capture'],
  '/spokedu-lab/students': [],
  '/spokedu-lab/classes': ['create', 'from', 'date'],
  '/spokedu-lab/class-tools': ['session', 'returnTo', 'source', 'tool'],
  '/spokedu-lab/spomove': ['view', 'group', 'difficulty', 'movement', 'q', 'session', 'returnTo', 'source'],
  '/spokedu-lab/spomove/session': [
    'preset',
    'rounds',
    'mode',
    'sound',
    'entry',
    'program',
    'cueSeconds',
    'recommendedCueSeconds',
    'difficulty',
    'hubReturn',
    'returnTo',
    'source',
    'session',
    'sessionProgram',
  ],
};

/** Longer limit for nested return URLs (hubReturn / returnTo). */
export const MASTER_CONTEXT_VALUE_MAX = 400;
export const MASTER_CONTEXT_SIMPLE_VALUE_MAX = 180;

export function resolveMasterContextQueryKeys(pathname: string): readonly string[] {
  const path = normalizeMasterAppPath(pathname);
  if (path.startsWith('/spokedu-lab/library/')) return MASTER_POST_PAYMENT_QUERY_KEYS['/spokedu-lab/library'];
  if (path.startsWith('/spokedu-lab/spomove/session')) return MASTER_POST_PAYMENT_QUERY_KEYS['/spokedu-lab/spomove/session'];
  if (path.startsWith('/spokedu-lab/spomove')) return MASTER_POST_PAYMENT_QUERY_KEYS['/spokedu-lab/spomove'];
  if (path.startsWith('/spokedu-lab/class-record')) return MASTER_POST_PAYMENT_QUERY_KEYS['/spokedu-lab/class-record'];
  if (path.startsWith('/spokedu-lab/class-tools')) return MASTER_POST_PAYMENT_QUERY_KEYS['/spokedu-lab/class-tools'];
  if (path.startsWith('/spokedu-lab/report')) return MASTER_POST_PAYMENT_QUERY_KEYS['/spokedu-lab/report'];
  if (path.startsWith('/spokedu-lab/activity')) return MASTER_POST_PAYMENT_QUERY_KEYS['/spokedu-lab/activity'];
  if (path.startsWith('/spokedu-lab/manage')) return MASTER_POST_PAYMENT_QUERY_KEYS['/spokedu-lab/manage'];
  if (path.startsWith('/spokedu-lab/students/')) return [];
  if (path.startsWith('/spokedu-lab/students')) return MASTER_POST_PAYMENT_QUERY_KEYS['/spokedu-lab/students'];
  if (path.startsWith('/spokedu-lab/classes/')) return [];
  if (path.startsWith('/spokedu-lab/classes')) return MASTER_POST_PAYMENT_QUERY_KEYS['/spokedu-lab/classes'];
  if (path === '/spokedu-lab/library') return MASTER_POST_PAYMENT_QUERY_KEYS['/spokedu-lab/library'];
  return [];
}

export function isMasterNestedReturnKey(key: string) {
  return key === 'hubReturn' || key === 'returnTo';
}

export function buildActivitySessionHref(sessionId: string) {
  return `/spokedu-lab/activity?session=${encodeURIComponent(sessionId)}`;
}

export function buildManageSessionHref(sessionId: string) {
  return `/spokedu-lab/manage?session=${encodeURIComponent(sessionId)}`;
}

export function isMasterSessionSurfaceReturn(href: string | null | undefined): href is string {
  return Boolean(
    normalizeMasterAppPath(href ?? '') === '/spokedu-lab/activity'
    || normalizeMasterAppPath(href ?? '').startsWith('/spokedu-lab/activity?')
    || normalizeMasterAppPath(href ?? '') === '/spokedu-lab/manage'
    || normalizeMasterAppPath(href ?? '').startsWith('/spokedu-lab/manage?'),
  );
}

export function buildClassCreateFromSessionHref(date: string) {
  const day = date.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return '/spokedu-lab/classes?create=1';
  return `/spokedu-lab/classes?create=1&from=session&date=${encodeURIComponent(day)}`;
}

export function parseSessionClassCreateReturnDate(from: string | null, date: string | null) {
  const day = date?.trim() ?? '';
  if (from !== 'session' || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  return day;
}

export function buildManageDateHref(date: string) {
  return `/spokedu-lab/manage?date=${encodeURIComponent(date)}`;
}

export function buildManageSessionCreateHref(classId: string, date: string) {
  return `/spokedu-lab/manage?date=${encodeURIComponent(date)}&create=1&class=${encodeURIComponent(classId)}`;
}

export function parseMasterWorkReturnHref(
  returnTo: string | null | undefined,
  hubReturn: string | null | undefined,
  hubView?: string | null,
  fallback = '/spokedu-lab/spomove',
): string {
  const candidates = [returnTo, hubReturn].filter(Boolean) as string[];
  for (const raw of candidates) {
    let decoded = raw;
    try {
      decoded = decodeURIComponent(raw);
    } catch {
      decoded = raw;
    }
    const canonical = normalizeMasterAppPath(decoded);
    if (
      canonical === '/spokedu-lab/activity'
      || canonical.startsWith('/spokedu-lab/activity?')
      || canonical === '/spokedu-lab/manage'
      || canonical.startsWith('/spokedu-lab/manage?')
      || canonical === '/spokedu-lab/spomove'
      || canonical.startsWith('/spokedu-lab/spomove?')
      || canonical === '/spokedu-lab/dashboard'
      || canonical.startsWith('/spokedu-lab/dashboard?')
      || canonical === '/spokedu-lab/favorites'
      || canonical.startsWith('/spokedu-lab/favorites?')
      || canonical.startsWith('/spokedu-lab/classes/')
      || canonical.startsWith('/spokedu-lab/library')
      || canonical.startsWith('/spokedu-lab/class-tools')
      || canonical.startsWith('/spokedu-lab/report')
    ) {
      return canonical;
    }
  }
  void hubView;
  return fallback;
}

export type SpomoveSessionOrigin = {
  sessionId: string | null;
  sessionProgramId: string | null;
  returnTo: string | null;
  isSessionOrigin: boolean;
};

export function readSpomoveSessionOrigin(params: Pick<URLSearchParams, 'get'>): SpomoveSessionOrigin {
  const sessionId = params.get('session')?.trim() || null;
  const sessionProgramId = params.get('sessionProgram')?.trim() || null;
  const returnTo = params.get('returnTo')?.trim() || null;
  const isSessionOrigin = Boolean(sessionId) || isMasterSessionSurfaceReturn(returnTo);
  return { sessionId, sessionProgramId, returnTo, isSessionOrigin };
}
