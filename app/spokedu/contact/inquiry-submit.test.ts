// @vitest-environment jsdom

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { submitInquiry } from '../contact/inquiry-submit';
import { TEMP_INQUIRY_STORAGE_KEY } from '../contact/inquiry-draft';
import type { InquiryPayload, PrivateInquiryPayload, SpomoveInquiryPayload } from '../contact/inquiry-types';

const basePrivatePayload: PrivateInquiryPayload = {
  type: 'private',
  createdAt: '2026-07-01T00:00:00.000Z',
  name: '홍길동',
  phone: '010-1234-5678',
  email: 'test@example.com',
  preferredRegion: '서울',
  message: '상담 요청',
  childAge: '만 8세',
  preferredClassType: '1:1',
  preferredLocation: 'LAB',
  privacyConsent: true,
};

const payloads: InquiryPayload[] = [
  basePrivatePayload,
  { ...basePrivatePayload, type: 'dispatch', organizationName: '로컬 검증 기관', targetAge: '초등', expectedParticipants: '20', preferredOperation: '정규수업' },
  { ...basePrivatePayload, type: 'spomove', organizationName: '로컬 검증 기관', targetAge: '초등', expectedParticipants: '20', preferredOperation: 'SPOMOVE' },
  { ...basePrivatePayload, type: 'curriculum', nameOrOrg: '로컬 검증 기관', inquiryPurpose: '구독시스템', utilizationTarget: '기관 도입', targetAge: '초등' },
  { ...basePrivatePayload, type: 'other', nameOrOrg: '로컬 검증 기관', collaborationPurpose: '라이선스' },
];

describe('submitInquiry', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it.each(payloads)('blocks $type without consent before network or local storage', async (payload) => {
    for (const privacyConsent of [false, undefined]) {
      expect(await submitInquiry({ ...payload, privacyConsent })).toEqual({ ok: false, mode: 'consent' });
    }
    expect(fetch).not.toHaveBeenCalled();
    expect(window.localStorage.getItem(TEMP_INQUIRY_STORAGE_KEY)).toBeNull();
  });

  it.each(payloads)('handles $type server failures and a successful retry', async (payload) => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response('{"ok":false}', { status: 400 }));
    expect(await submitInquiry(payload)).toEqual({ ok: false, mode: 'temp' });
    expect(JSON.parse(window.localStorage.getItem(TEMP_INQUIRY_STORAGE_KEY)!).payload.type).toBe(payload.type);
    vi.mocked(fetch).mockResolvedValueOnce(new Response('{"ok":true}', { status: 200 }));
    expect(await submitInquiry(payload)).toEqual({ ok: true, mode: 'api' });
    const expected = payload.type === 'private' ? '/api/private/leads'
      : payload.type === 'dispatch' || payload.type === 'spomove' ? '/api/dispatch/leads' : '/api/curriculum/leads';
    expect(vi.mocked(fetch).mock.calls[1][0]).toBe(expected);
    const body = JSON.parse(String(vi.mocked(fetch).mock.calls[1][1]?.body));
    expect(body.privacy_consent).toBe(true);
    expect(body.acquisition.submitPath).toBe(`${window.location.pathname}${window.location.search}`);
  });

  it('returns ok when API succeeds', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    );

    const result = await submitInquiry(basePrivatePayload);
    expect(result).toEqual({ ok: true, mode: 'api' });
    expect(window.localStorage.getItem(TEMP_INQUIRY_STORAGE_KEY)).toBeNull();
    const body = JSON.parse(String(vi.mocked(fetch).mock.calls[0]?.[1]?.body));
    expect(body.privacy_consent).toBe(true);
    expect(body.preferred_format).toBe('one-to-one');
  });

  it('preserves the chosen small-group format', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    await submitInquiry({ ...basePrivatePayload, preferredClassType: '소그룹' });
    const body = JSON.parse(String(vi.mocked(fetch).mock.calls[0]?.[1]?.body));
    expect(body.privacy_consent).toBe(true);
    expect(body.preferred_format).toBe('small-group');
  });

  it('stores draft and returns failure when API fails', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ ok: false, message: 'fail' }), { status: 500 }),
    );

    const result = await submitInquiry(basePrivatePayload);
    expect(result).toEqual({ ok: false, mode: 'temp' });
    const stored = window.localStorage.getItem(TEMP_INQUIRY_STORAGE_KEY);
    expect(stored).toBeTruthy();
    expect(stored).toContain('"type":"private"');
  });

  it('maps spomove inquiries to dispatch leads endpoint', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    );

    const spomovePayload: SpomoveInquiryPayload = {
      privacyConsent: true,
      type: 'spomove',
      createdAt: '2026-07-01T00:00:00.000Z',
      name: '홍길동',
      phone: '010-1234-5678',
      email: 'test@example.com',
      preferredRegion: '서울',
      message: 'SPOMOVE 도입 문의',
      organizationName: '테스트센터',
      targetAge: '초등',
      expectedParticipants: '20',
      preferredOperation: 'SPOMOVE 도입',
    };

    await submitInquiry(spomovePayload);

    expect(fetch).toHaveBeenCalledWith(
      '/api/dispatch/leads',
      expect.objectContaining({ method: 'POST' }),
    );
    const body = JSON.parse(String(vi.mocked(fetch).mock.calls[0]?.[1]?.body));
    expect(body.source).toBe('spokedu-contact-spomove');
    expect(body.programs).toContain('SPOMOVE');
  });

  it('maps curriculum subscription purpose to master lead_mode', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    );

    await submitInquiry({
      privacyConsent: true,
      type: 'curriculum',
      createdAt: '2026-07-01T00:00:00.000Z',
      name: '홍길동',
      phone: '010-1234-5678',
      email: 'test@example.com',
      preferredRegion: '서울',
      message: '구독 문의',
      nameOrOrg: '테스트센터',
      inquiryPurpose: '구독시스템',
      utilizationTarget: '기관 도입',
      targetAge: '초등',
    });

    expect(fetch).toHaveBeenCalledWith(
      '/api/curriculum/leads',
      expect.objectContaining({ method: 'POST' }),
    );
    const body = JSON.parse(String(vi.mocked(fetch).mock.calls[0]?.[1]?.body));
    expect(body.lead_mode).toBe('master');
    expect(body.cta_intent_id).toBe('master_org_inquiry');
  });
});
