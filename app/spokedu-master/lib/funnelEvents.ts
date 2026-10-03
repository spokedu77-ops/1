'use client';

export type MasterClientFunnelEventName = 'landing_visit' | 'first_value_program_detail' | 'core_use_daily' | 'upgrade_intent' | 'checkout_started';

export function trackMasterFunnelEvent(name: MasterClientFunnelEventName, context: Record<string, string> = {}) {
  try {
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
