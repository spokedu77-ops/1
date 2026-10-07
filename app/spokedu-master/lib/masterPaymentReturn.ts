import type { MasterGateIntentKind } from './masterGateIntent';
import {
  MASTER_CONTEXT_ORIGIN,
  MASTER_CONTEXT_SIMPLE_VALUE_MAX,
  MASTER_CONTEXT_VALUE_MAX,
  isMasterNestedReturnKey,
  normalizeMasterAppPath,
  resolveMasterContextQueryKeys,
} from './masterNavigationContext';

const DEFAULT_FALLBACK = '/spokedu-lab/dashboard';
const MAX_RETURN_VALUE_LENGTH = 1200;

const BLOCKED_POST_PAYMENT_PATHS = new Set([
  '/spokedu-lab/payment',
  '/spokedu-lab/payment/success',
  '/spokedu-lab/payment/cancel',
]);

export const MASTER_INTENT_FALLBACKS: Record<MasterGateIntentKind, string> = {
  open_library: '/spokedu-lab/library',
  use_attendance: '/spokedu-lab/activity',
  start_spomove: '/spokedu-lab/spomove',
  continue_record: '/spokedu-lab/class-record',
};

function isBlockedReturnPath(pathname: string) {
  return Array.from(BLOCKED_POST_PAYMENT_PATHS).some(
    (blocked) => pathname === blocked || pathname.startsWith(`${blocked}/`),
  );
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
  const safeFallback = fallback.startsWith('/spokedu-master') || fallback.startsWith('/spokedu-lab')
    ? normalizeMasterAppPath(fallback)
    : DEFAULT_FALLBACK;
  const value = rawNext?.trim();
  if (!value || value.length > MAX_RETURN_VALUE_LENGTH) return safeFallback;
  if (/^\s*(https?:|javascript:|data:|\/\/)/i.test(value)) return safeFallback;

  let parsed: URL;
  try {
    parsed = new URL(value, MASTER_CONTEXT_ORIGIN);
  } catch {
    return safeFallback;
  }

  if (parsed.origin !== MASTER_CONTEXT_ORIGIN) return safeFallback;
  const canonicalPathname = normalizeMasterAppPath(parsed.pathname);
  if (!canonicalPathname.startsWith('/spokedu-lab')) return safeFallback;
  if (canonicalPathname.startsWith('/spokedu-lab/class-mode')) return safeFallback;
  if (isBlockedReturnPath(canonicalPathname)) return safeFallback;

  const allowedKeys = resolveMasterContextQueryKeys(canonicalPathname);
  const nextParams = new URLSearchParams();
  for (const key of allowedKeys) {
    for (const valueForKey of parsed.searchParams.getAll(key)) {
      const max = isMasterNestedReturnKey(key) ? MASTER_CONTEXT_VALUE_MAX : MASTER_CONTEXT_SIMPLE_VALUE_MAX;
      if (valueForKey.length <= max) nextParams.append(key, valueForKey);
    }
  }

  const query = nextParams.toString();
  const hash = sanitizeHash(parsed.hash);
  return `${canonicalPathname}${query ? `?${query}` : ''}${hash}`;
}
