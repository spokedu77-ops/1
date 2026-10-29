/**
 * education v0 폼 — 5필드 최소 페이로드가 dispatch/leads 검증·CRM 저장 경로를 통과하는지 확인.
 */
import { describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const consultId = '22222222-2222-2222-2222-222222222222';
const detailId = '33333333-3333-3333-3333-333333333333';

const emptyDedupe = Promise.resolve({ data: [] as unknown[], error: null });

function consultationsBuilder() {
  const limitBuilder = {
    eq: () => emptyDedupe,
    then: (onF: (v: unknown) => unknown, onR?: (e: unknown) => unknown) => emptyDedupe.then(onF, onR),
  };
  const orderBuilder = { limit: () => limitBuilder };
  const gteBuilder = { order: () => orderBuilder };
  const eqParent = { gte: () => gteBuilder };
  const eqType = { eq: () => eqParent };
  return {
    select: () => ({ eq: () => eqType }),
    update: () => ({
      eq: async () => ({ error: null }),
    }),
  };
}

vi.mock('@/app/lib/server/adminAuth', () => ({
  getServiceSupabase: vi.fn(() => ({
    from: (table: string) => {
      if (table === 'consultations') return consultationsBuilder();
      if (table === 'dispatch_leads') {
        return {
          insert: () => ({
            select: () => ({
              single: async () => ({ data: { id: detailId }, error: null }),
            }),
          }),
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
  })),
}));

vi.mock('@/app/lib/server/leadEnvelope', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/app/lib/server/leadEnvelope')>();
  return {
    ...actual,
    createConsultLead: vi.fn(async () => ({ ok: true as const, id: consultId, structured: true })),
  };
});

describe('dispatch/leads education v0 minimal payload', () => {
  it('accepts 5-field body without legacy dates/location/ages', async () => {
    const { POST } = await import('./route');
    const req = new NextRequest('http://localhost/api/dispatch/leads', {
      method: 'POST',
      body: JSON.stringify({
        type: 'dispatch',
        organization: 'v0 테스트 초등학교',
        manager: '김담당',
        phone: '01099998888',
        email: '',
        programs: ['SPOMOVE'],
        inquiry: '예상 인원 25명, 4월 시작 희망',
        source: 'spokedu-education-v0',
        privacy_consent: true,
        cta_intent_id: 'dispatch_proposal',
        acquisition: { entrySurface: 'direct' },
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok?: boolean; consultId?: string; detailId?: string };
    expect(body.ok).toBe(true);
    expect(body.consultId).toBe(consultId);
    expect(body.detailId).toBe(detailId);
  });

  it('rejects spokedu-education-v0 without privacy_consent', async () => {
    const { POST } = await import('./route');
    const req = new NextRequest('http://localhost/api/dispatch/leads', {
      method: 'POST',
      body: JSON.stringify({
        type: 'dispatch',
        organization: '테스트',
        manager: '담당',
        phone: '01011112222',
        source: 'spokedu-education-v0',
        cta_intent_id: 'dispatch_proposal',
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('accepts spokedu-dispatch-proposal with privacy_consent', async () => {
    const { POST } = await import('./route');
    const req = new NextRequest('http://localhost/api/dispatch/leads', {
      method: 'POST',
      body: JSON.stringify({
        type: 'dispatch',
        organization: 'legacy 폼 기관',
        manager: '담당',
        phone: '01033334444',
        email: 'legacy@example.com',
        programs: ['월간 뉴스포츠'],
        inquiry: '운영안 문의',
        source: 'spokedu-dispatch-proposal',
        privacy_consent: true,
        cta_intent_id: 'dispatch_proposal',
        acquisition: { entrySurface: 'direct' },
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
  });

  it('rejects spokedu-dispatch-proposal without privacy_consent', async () => {
    const { POST } = await import('./route');
    const req = new NextRequest('http://localhost/api/dispatch/leads', {
      method: 'POST',
      body: JSON.stringify({
        type: 'dispatch',
        organization: 'legacy',
        manager: '담당',
        phone: '01055556666',
        source: 'spokedu-dispatch-proposal',
        cta_intent_id: 'dispatch_proposal',
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
