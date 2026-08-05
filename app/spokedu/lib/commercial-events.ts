'use client';

import type { LeadRoute } from '../data/lead-envelope';

export type CommercialEvent =
  | {
      name: 'selection_changed';
      route: 'private' | 'curriculum' | 'dispatch';
      selectionId: string;
    }
  | {
      name: 'evidence_opened';
      route: LeadRoute;
      evidenceSlug: string;
    }
  | {
      name: 'primary_cta_clicked';
      route: LeadRoute;
      ctaIntentId: string;
      selectionId?: string;
      evidenceSlug?: string;
    }
  | {
      name: 'form_submitted';
      route: LeadRoute;
      leadId: string;
      selectionId?: string;
      ctaIntentId: string;
    };

/** PII 없이 퍼널 이벤트 전송. 실패해도 호출부 흐름을 막지 않음. */
export function trackCommercialEvent(event: CommercialEvent): void {
  try {
    const body = JSON.stringify(event);
    const send = () =>
      fetch('/api/spokedu/commercial-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
      }).catch(() => undefined);

    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([body], { type: 'application/json' });
      const ok = navigator.sendBeacon('/api/spokedu/commercial-events', blob);
      if (!ok) void send();
      return;
    }
    void send();
  } catch {
    // never throw
  }
}
