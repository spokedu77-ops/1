/**
 * private v0 폼 — type: private 태깅 및 최소 필드 페이로드.
 */
import { describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const leadId = '44444444-4444-4444-4444-444444444444';

vi.mock('@/app/lib/server/adminAuth', () => ({
  getServiceSupabase: vi.fn(() => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            eq: () => ({
              gte: () => ({
                order: () => ({
                  limit: () => ({
                    maybeSingle: async () => ({ data: null, error: null }),
                  }),
                }),
              }),
            }),
          }),
        }),
      }),
    }),
  })),
}));

vi.mock('@/app/lib/server/leadEnvelope', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/app/lib/server/leadEnvelope')>();
  return {
    ...actual,
    createConsultLead: vi.fn(async () => ({ ok: true as const, id: leadId, structured: true })),
  };
});

describe('private/leads privateV0 payload', () => {
  it('accepts v0 fields with type private and consult_type tutoring path', async () => {
    const { POST } = await import('./route');
    const req = new NextRequest('http://localhost/api/private/leads', {
      method: 'POST',
      body: JSON.stringify({
        type: 'private',
        parent_name: '이학부모',
        child_age: '8세',
        phone: '01077776666',
        name: '아이 8세',
        content: '[학부모] 이학부모\n[아이 연령/학년] 8세\n[희망 수업 형태] 1:1 개인수업',
        start_direction: 'fundamental',
        preferred_format: 'one-to-one',
        region: '[상담 후 확인]',
        schedule: '[상담 후 확인]',
        cta_intent_id: 'private_fit_consult',
        acquisition: { entrySurface: 'direct' },
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok?: boolean; leadId?: string };
    expect(body.ok).toBe(true);
    expect(body.leadId).toBe(leadId);
  });
});
