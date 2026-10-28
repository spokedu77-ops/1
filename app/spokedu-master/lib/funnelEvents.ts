'use client';

export type MasterClientFunnelEventName = 'landing_visit' | 'first_value_program_detail' | 'core_use_daily' | 'upgrade_intent' | 'checkout_started';

export type TrackMasterFunnelEventOptions = {
  userId?: string | null;
  /** Test hook — defaults to current time. */
  occurredAt?: Date;
};

const CORE_USE_DAILY_IN_FLIGHT = new Map<string, Promise<void>>();
const CORE_USE_DAILY_MEMORY_SENT = new Set<string>();
const SESSION_STORAGE_PREFIX = 'spokedu-master:funnel:';

export function buildCoreUseDailyDedupeKey(userId: string, occurredAt: Date) {
  return `core_use_daily:${userId}:${occurredAt.toISOString().slice(0, 10)}`;
}

function coreUseDailySessionStorageKey(dedupeKey: string) {
  return `${SESSION_STORAGE_PREFIX}${dedupeKey}`;
}

export function hasStoredCoreUseDailySuccess(dedupeKey: string) {
  if (CORE_USE_DAILY_MEMORY_SENT.has(dedupeKey)) return true;
  try {
    return sessionStorage.getItem(coreUseDailySessionStorageKey(dedupeKey)) === '1';
  } catch {
    return CORE_USE_DAILY_MEMORY_SENT.has(dedupeKey);
  }
}

function markCoreUseDailySuccess(dedupeKey: string) {
  CORE_USE_DAILY_MEMORY_SENT.add(dedupeKey);
  try {
    sessionStorage.setItem(coreUseDailySessionStorageKey(dedupeKey), '1');
  } catch {
    // sessionStorage unavailable — memory fallback only.
  }
}

export function resetCoreUseDailyFunnelDedupeForTests() {
  CORE_USE_DAILY_IN_FLIGHT.clear();
  CORE_USE_DAILY_MEMORY_SENT.clear();
}

async function postMasterFunnelEvent(body: string): Promise<boolean> {
  const response = await fetch('/api/spokedu-master/funnel-events', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body,
    keepalive: true,
  });
  if (!response.ok) return false;
  const payload = await response.json().catch(() => null) as { stored?: boolean } | null;
  return payload?.stored === true;
}

async function trackCoreUseDailyEvent(context: Record<string, string>, options: TrackMasterFunnelEventOptions) {
  const userId = options.userId?.trim();
  if (!userId) return;

  const occurredAt = options.occurredAt ?? new Date();
  const dedupeKey = buildCoreUseDailyDedupeKey(userId, occurredAt);
  if (hasStoredCoreUseDailySuccess(dedupeKey)) return;

  const inFlight = CORE_USE_DAILY_IN_FLIGHT.get(dedupeKey);
  if (inFlight) {
    await inFlight.catch(() => undefined);
    return;
  }

  const body = JSON.stringify({ name: 'core_use_daily', ...context });
  const task = postMasterFunnelEvent(body)
    .then((stored) => {
      if (stored) markCoreUseDailySuccess(dedupeKey);
    })
    .finally(() => {
      CORE_USE_DAILY_IN_FLIGHT.delete(dedupeKey);
    });

  CORE_USE_DAILY_IN_FLIGHT.set(dedupeKey, task);
  await task.catch(() => undefined);
}

export function trackMasterFunnelEvent(
  name: MasterClientFunnelEventName,
  context: Record<string, string> = {},
  options: TrackMasterFunnelEventOptions = {},
) {
  try {
    if (name === 'core_use_daily') {
      void trackCoreUseDailyEvent(context, options);
      return;
    }

    const body = JSON.stringify({ name, ...context });
    if (name === 'landing_visit' && typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const sent = navigator.sendBeacon('/api/spokedu-master/funnel-events', new Blob([body], { type: 'application/json' }));
      if (sent) return;
    }
    void fetch('/api/spokedu-master/funnel-events', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    // Analytics never blocks the product journey.
  }
}
