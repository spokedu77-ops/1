import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('commercial events contract', () => {
  it('allows form_started alongside existing event names', () => {
    const route = readFileSync(
      join(process.cwd(), 'app/api/spokedu/commercial-events/route.ts'),
      'utf8',
    );
    expect(route).toContain("'selection_changed'");
    expect(route).toContain("'evidence_opened'");
    expect(route).toContain("'primary_cta_clicked'");
    expect(route).toContain("'form_submitted'");
    expect(route).toContain("'form_started'");
  });

  it('keeps client payload helpers for schema_version and form_started once', async () => {
    const mod = await import('../lib/commercial-events');
    expect(mod.COMMERCIAL_EVENT_SCHEMA_VERSION).toBe(1);

    const started: unknown[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, init?: RequestInit) => {
        started.push(JSON.parse(String(init?.body)));
        return { ok: true } as Response;
      }),
    );
    vi.stubGlobal('navigator', {
      sendBeacon: undefined,
    });

    const mark = mod.createFormStartedTracker('dispatch', 'contact_dispatch');
    mark();
    mark();
    mark();
    expect(started).toHaveLength(1);
    expect(started[0]).toMatchObject({
      name: 'form_started',
      route: 'dispatch',
      schema_version: 1,
      ctaIntentId: 'contact_dispatch',
    });

    vi.unstubAllGlobals();
  });
});

describe('contact kakao fallback SSOT', () => {
  it('uses live kakao channel from brand/external-channels', async () => {
    const { contactPageContent } = await import('../contact/contact-page-data');
    const { KAKAO_CHANNEL_URL } = await import('../data/external-channels');
    expect(KAKAO_CHANNEL_URL).toMatch(/^https:\/\/pf\.kakao\.com\//);
    expect(contactPageContent.kakaoChannelHref).toBe(KAKAO_CHANNEL_URL);
    expect(contactPageContent.inquiryTypes.map((t) => t.id)).toEqual([
      'dispatch',
      'private',
      'curriculum',
      'spomove',
      'other',
    ]);
  });
});
