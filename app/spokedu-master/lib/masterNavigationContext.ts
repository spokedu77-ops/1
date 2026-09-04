/**
 * MASTER navigation / payment context SSOT.
 *
 * Categories (ad-hoc query names outside this map are forbidden for continuity):
 *
 * OBJECT: session, sessionProgram, class, student, program, preset
 * DISCOVERY: view, group, difficulty, movement, q, from
 * WORK: date, create, entry, mode, cueSeconds, sound, rounds, difficulty
 * RETURN: returnTo (Session / work), hubReturn (SPOMOVE exploration)
 * COMMERCIAL: intent / next / journeyId live on Gate/Payment routes, not here
 *
 * Payment (`masterPaymentReturn`) and in-app returns must use the same allowlists.
 */

export const MASTER_CONTEXT_ORIGIN = 'https://spokedu.local';

export const MASTER_POST_PAYMENT_QUERY_KEYS: Record<string, readonly string[]> = {
  '/spokedu-master/library': ['from', 'session', 'sessionProgram', 'returnTo', 'source'],
  '/spokedu-master/class-record': ['program', 'record'],
  '/spokedu-master/report': ['session', 'program', 'record'],
  '/spokedu-master/activity': ['session', 'date', 'create', 'class', 'program', 'record', 'capture'],
  '/spokedu-master/students': [],
  '/spokedu-master/classes': ['create'],
  '/spokedu-master/class-tools': ['session', 'returnTo', 'source'],
  '/spokedu-master/spomove': ['view', 'group', 'difficulty', 'movement', 'q', 'session', 'returnTo', 'source'],
  '/spokedu-master/spomove/session': [
    'preset',
    'rounds',
    'mode',
    'sound',
    'entry',
    'program',
    'cueSeconds',
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
  if (pathname.startsWith('/spokedu-master/library/')) return MASTER_POST_PAYMENT_QUERY_KEYS['/spokedu-master/library'];
  if (pathname.startsWith('/spokedu-master/spomove/session')) return MASTER_POST_PAYMENT_QUERY_KEYS['/spokedu-master/spomove/session'];
  if (pathname.startsWith('/spokedu-master/spomove')) return MASTER_POST_PAYMENT_QUERY_KEYS['/spokedu-master/spomove'];
  if (pathname.startsWith('/spokedu-master/class-record')) return MASTER_POST_PAYMENT_QUERY_KEYS['/spokedu-master/class-record'];
  if (pathname.startsWith('/spokedu-master/class-tools')) return MASTER_POST_PAYMENT_QUERY_KEYS['/spokedu-master/class-tools'];
  if (pathname.startsWith('/spokedu-master/report')) return MASTER_POST_PAYMENT_QUERY_KEYS['/spokedu-master/report'];
  if (pathname.startsWith('/spokedu-master/activity')) return MASTER_POST_PAYMENT_QUERY_KEYS['/spokedu-master/activity'];
  if (pathname.startsWith('/spokedu-master/students/')) return [];
  if (pathname.startsWith('/spokedu-master/students')) return MASTER_POST_PAYMENT_QUERY_KEYS['/spokedu-master/students'];
  if (pathname.startsWith('/spokedu-master/classes/')) return [];
  if (pathname.startsWith('/spokedu-master/classes')) return MASTER_POST_PAYMENT_QUERY_KEYS['/spokedu-master/classes'];
  if (pathname === '/spokedu-master/library') return MASTER_POST_PAYMENT_QUERY_KEYS['/spokedu-master/library'];
  return [];
}

export function isMasterNestedReturnKey(key: string) {
  return key === 'hubReturn' || key === 'returnTo';
}

export function buildActivitySessionHref(sessionId: string) {
  return `/spokedu-master/activity?session=${encodeURIComponent(sessionId)}`;
}

export function parseMasterWorkReturnHref(
  returnTo: string | null | undefined,
  hubReturn: string | null | undefined,
  hubView?: string | null,
  fallback = '/spokedu-master/spomove',
): string {
  const candidates = [returnTo, hubReturn].filter(Boolean) as string[];
  for (const raw of candidates) {
    let decoded = raw;
    try {
      decoded = decodeURIComponent(raw);
    } catch {
      decoded = raw;
    }
    if (
      decoded === '/spokedu-master/activity'
      || decoded.startsWith('/spokedu-master/activity?')
      || decoded === '/spokedu-master/spomove'
      || decoded.startsWith('/spokedu-master/spomove?')
      || decoded === '/spokedu-master/dashboard'
      || decoded.startsWith('/spokedu-master/dashboard?')
      || decoded === '/spokedu-master/favorites'
      || decoded.startsWith('/spokedu-master/favorites?')
      || decoded.startsWith('/spokedu-master/classes/')
      || decoded.startsWith('/spokedu-master/library')
      || decoded.startsWith('/spokedu-master/class-tools')
      || decoded.startsWith('/spokedu-master/report')
    ) {
      return decoded;
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
  const isSessionOrigin = Boolean(sessionId) || Boolean(returnTo?.startsWith('/spokedu-master/activity'));
  return { sessionId, sessionProgramId, returnTo, isSessionOrigin };
}
