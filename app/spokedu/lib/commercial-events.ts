'use client';

/**
 * PII 없이 퍼널 이벤트 전송.
 * Phase 2 스키마: surface / audience / ctaIntentId / destination / page_path / schema_version
 * 기존 이벤트명 유지. form_started는 폼 인스턴스당 1회.
 */

import type { LeadRoute } from '../data/lead-envelope';

export const COMMERCIAL_EVENT_SCHEMA_VERSION = 1 as const;

export type CommercialEventAudience =
  | 'institution'
  | 'parent'
  | 'instructor'
  | 'partner'
  | 'other';

export type CommercialEventSurface =
  | 'home'
  | 'programs'
  | 'record'
  | 'campaign'
  | 'direct'
  | 'contact'
  | 'curriculum'
  | 'education';

type CommercialEventBase = {
  surface?: CommercialEventSurface | string;
  audience?: CommercialEventAudience | string;
  destination?: string;
  page_path?: string;
  schema_version?: typeof COMMERCIAL_EVENT_SCHEMA_VERSION | number;
};

export type CommercialEvent =
  | (CommercialEventBase & {
      name: 'selection_changed';
      route: 'private' | 'curriculum' | 'dispatch';
      selectionId: string;
    })
  | (CommercialEventBase & {
      name: 'evidence_opened';
      route: LeadRoute;
      evidenceSlug: string;
    })
  | (CommercialEventBase & {
      name: 'primary_cta_clicked';
      route: LeadRoute;
      ctaIntentId: string;
      selectionId?: string;
      evidenceSlug?: string;
    })
  | (CommercialEventBase & {
      name: 'form_started';
      route: LeadRoute;
      ctaIntentId?: string;
      selectionId?: string;
    })
  | (CommercialEventBase & {
      name: 'form_submitted';
      route: LeadRoute;
      leadId: string;
      selectionId?: string;
      ctaIntentId: string;
    });

function withDefaultMeta(event: CommercialEvent): CommercialEvent {
  const page_path =
    event.page_path ??
    (typeof window !== 'undefined' ? window.location.pathname : undefined);
  return {
    ...event,
    schema_version: event.schema_version ?? COMMERCIAL_EVENT_SCHEMA_VERSION,
    ...(page_path ? { page_path } : {}),
  };
}

/** PII 없이 퍼널 이벤트 전송. 실패해도 호출부 흐름을 막지 않음. */
export function trackCommercialEvent(event: CommercialEvent): void {
  try {
    const body = JSON.stringify(withDefaultMeta(event));
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

/** 폼 인스턴스당 form_started 1회 */
export function createFormStartedTracker(route: LeadRoute, ctaIntentId?: string) {
  let started = false;
  return () => {
    if (started) return;
    started = true;
    trackCommercialEvent({
      name: 'form_started',
      route,
      ctaIntentId,
      surface: 'contact',
    });
  };
}
