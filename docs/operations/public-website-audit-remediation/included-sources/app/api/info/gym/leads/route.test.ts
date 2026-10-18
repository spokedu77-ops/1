import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const insertMock = vi.fn();

vi.mock('@/app/lib/server/adminAuth', () => ({
  getServiceSupabase: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            gte: () => ({
              limit: () => ({
                maybeSingle: async () => ({ data: null, error: null }),
              }),
            }),
          }),
        }),
      }),
      insert: () => ({
        select: () => ({
          single: insertMock,
        }),
      }),
    }),
  }),
}));

vi.mock('@/app/lib/server/publicLeadSpamGuard', () => ({
  isHoneypotTripped: () => false,
  evaluatePublicLeadRateLimit: async () => ({ status: 'allow' }),
  rateLimitToResponse: () => null,
  getTrustedClientIp: () => '127.0.0.1',
}));

describe('/api/info/gym/leads', () => {
  beforeEach(() => {
    insertMock.mockReset();
  });

  it('returns 500 when DB insert fails', async () => {
    insertMock.mockResolvedValue({ data: null, error: { code: 'XX' } });
    const { POST } = await import('./route');
    const req = new NextRequest('http://localhost/api/info/gym/leads', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Tester',
        phone: '01012345678',
        age: '초등 저학년 (1-3학년)',
        consent: true,
        center: 'SPOKEDU LAB',
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(500);
  });

  it('returns ok when DB insert succeeds', async () => {
    insertMock.mockResolvedValue({ data: { id: 'abc' }, error: null });
    const { POST } = await import('./route');
    const req = new NextRequest('http://localhost/api/info/gym/leads', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Tester',
        phone: '01012345678',
        age: '초등 저학년 (1-3학년)',
        consent: true,
        center: 'SPOKEDU LAB',
      }),
    });
    const res = await POST(req);
    const json = (await res.json()) as { ok?: boolean };
    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
  });
});
