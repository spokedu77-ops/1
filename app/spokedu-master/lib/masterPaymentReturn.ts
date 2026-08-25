import type { MasterGateIntentKind } from './masterGateIntent';

const MASTER_ORIGIN = 'https://spokedu.local';
const DEFAULT_FALLBACK = '/spokedu-master/dashboard';
const MAX_RETURN_VALUE_LENGTH = 1200;

const BLOCKED_POST_PAYMENT_PATHS = new Set([
  '/spokedu-master/payment',
  '/spokedu-master/payment/success',
  '/spokedu-master/payment/cancel',
]);

const POST_PAYMENT_QUERY_KEYS: Record<string, readonly string[]> = {
  '/spokedu-master/library': ['from'],
  '/spokedu-master/class-record': ['program', 'record'],
  '/spokedu-master/report': ['program', 'record'],
  '/spokedu-master/activity': ['program', 'record'],
  '/spokedu-master/spomove': ['view'],
  '/spokedu-master/spomove/session': [
    'preset',
    'rounds',
    'mode',
    'sound',
    'entry',
    'program',
    'hubView',
    'cueSeconds',
    'difficulty',
  ],
};

export const MASTER_INTENT_FALLBACKS: Record<MasterGateIntentKind, string> = {
  open_library: '/spokedu-master/library',
  use_attendance: '/spokedu-master/activity',
  start_spomove: '/spokedu-master/spomove',
  continue_record: '/spokedu-master/class-record',
};

function isBlockedReturnPath(pathname: string) {
  return Array.from(BLOCKED_POST_PAYMENT_PATHS).some(
    (blocked) => pathname === blocked || pathname.startsWith(`${blocked}/`),
  );
}

function resolveAllowedQueryKeys(pathname: string) {
  if (pathname.startsWith('/spokedu-master/library/')) return POST_PAYMENT_QUERY_KEYS['/spokedu-master/library'];
  if (pathname.startsWith('/spokedu-master/spomove/session')) return POST_PAYMENT_QUERY_KEYS['/spokedu-master/spomove/session'];
  if (pathname.startsWith('/spokedu-master/spomove')) return POST_PAYMENT_QUERY_KEYS['/spokedu-master/spomove'];
  if (pathname.startsWith('/spokedu-master/class-record')) return POST_PAYMENT_QUERY_KEYS['/spokedu-master/class-record'];
  if (pathname.startsWith('/spokedu-master/report')) return POST_PAYMENT_QUERY_KEYS['/spokedu-master/report'];
  if (pathname.startsWith('/spokedu-master/activity')) return POST_PAYMENT_QUERY_KEYS['/spokedu-master/activity'];
  if (pathname === '/spokedu-master/library') return POST_PAYMENT_QUERY_KEYS['/spokedu-master/library'];
  return [];
}

function sanitizeHash(hash: string) {
  if (!hash || hash.length > 120) return '';
  return /^[#][A-Za-z0-9_-]+$/.test(hash) ? hash : '';
}

export function getFallbackForMasterIntent(intent: MasterGateIntentKind | null | undefined) {
  return intent ? MASTER_INTENT_FALLBACKS[intent] : DEFAULT_FALLBACK;
}

export function getSafeMasterPostPaymentPath(
  rawNext: string | null | undefined,
  fallback = DEFAULT_FALLBACK,
): string {
  const safeFallback = fallback.startsWith('/spokedu-master') ? fallback : DEFAULT_FALLBACK;
  const value = rawNext?.trim();
  if (!value || value.length > MAX_RETURN_VALUE_LENGTH) return safeFallback;
  if (/^\s*(https?:|javascript:|data:|\/\/)/i.test(value)) return safeFallback;

  let parsed: URL;
  try {
    parsed = new URL(value, MASTER_ORIGIN);
  } catch {
    return safeFallback;
  }

  if (parsed.origin !== MASTER_ORIGIN) return safeFallback;
  if (!parsed.pathname.startsWith('/spokedu-master')) return safeFallback;
  if (parsed.pathname.startsWith('/spokedu-master/class-mode')) return safeFallback;
  if (isBlockedReturnPath(parsed.pathname)) return safeFallback;

  const allowedKeys = resolveAllowedQueryKeys(parsed.pathname);
  const nextParams = new URLSearchParams();
  for (const key of allowedKeys) {
    for (const valueForKey of parsed.searchParams.getAll(key)) {
      if (valueForKey.length <= 180) nextParams.append(key, valueForKey);
    }
  }

  const query = nextParams.toString();
  const hash = sanitizeHash(parsed.hash);
  return `${parsed.pathname}${query ? `?${query}` : ''}${hash}`;
}

