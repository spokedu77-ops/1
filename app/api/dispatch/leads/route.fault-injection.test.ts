/**
 * FAULT_INJECTION_TEST — dispatch CRM vs detail partial failure (E09).
 * Does not touch live DB; mocks Service Supabase client.
 */
import { describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const consultId = '11111111-1111-1111-1111-111111111111';

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
              single: async () => ({
                data: null,
                error: { message: 'injected detail insert failure', code: 'XX000' },
              }),
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

describe('FAULT_INJECTION_TEST dispatch/leads E09', () => {
  it('keeps CRM row when dispatch_leads insert fails (detail_failed)', async () => {
    const { POST } = await import('./route');
    const req = new NextRequest('http://localhost/api/dispatch/leads', {
      method: 'POST',
      body: JSON.stringify({
        type: 'dispatch',
        organization: 'FaultOrg',
        manager: 'Tester',
        phone: '01012345678',
        email: 'fault-injection@spokedu.test',
        inquiry: 'FAULT_INJECTION_TEST detail fail',
        programs: ['SPOMOVE'],
        targetAge: ['초등'],
        source: 'fault-injection',
        cta_intent_id: 'dispatch_proposal',
        acquisition: { entrySurface: 'direct' },
      }),
    });

    const res = await POST(req);
    const body = (await res.json()) as {
      ok?: boolean;
      consultId?: string;
      detailId?: string | null;
      detailStatus?: string;
    };

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.consultId).toBe(consultId);
    expect(body.detailId).toBeNull();
    expect(body.detailStatus).toBe('detail_failed');
  });
});
