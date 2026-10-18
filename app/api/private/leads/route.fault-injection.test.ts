/**
 * FAULT_INJECTION_TEST — private lead DB insert failure (E08).
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

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
    createConsultLead: vi.fn(async () => ({ ok: false as const, error: 'injected DB failure' })),
  };
});

describe('FAULT_INJECTION_TEST private/leads E08', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('returns 500 and ok:false when CRM insert fails', async () => {
    const { POST } = await import('./route');
    const req = new NextRequest('http://localhost/api/private/leads', {
      method: 'POST',
      body: JSON.stringify({
        type: 'private',
        name: 'Fault Test',
        phone: '01099998888',
        content: 'FAULT_INJECTION_TEST',
        preferred_format: 'undecided',
        cta_intent_id: 'private_fit_consult',
        acquisition: { entrySurface: 'direct' },
      }),
    });

    const res = await POST(req);
    const body = (await res.json()) as { ok?: boolean; message?: string };

    expect(res.status).toBe(500);
    expect(body.ok).toBe(false);
    expect(body.message).toMatch(/DB|저장|실패/i);
  });
});
