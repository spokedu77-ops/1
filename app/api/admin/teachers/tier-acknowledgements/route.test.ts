import { beforeEach, describe, expect, it, vi } from 'vitest';

const fixture = vi.hoisted(() => ({
  authorized: true,
  teacher: { id: '11111111-1111-4111-8111-111111111111', name: '강사', email: 'teacher@example.com', role: 'teacher', is_admin: false, session_count: 51 },
  count: 0,
  countError: false,
  writeError: false,
  upsert: vi.fn(),
  service: vi.fn(),
}));

vi.mock('@/app/lib/server/adminAuth', () => ({
  requireAdmin: async () => fixture.authorized
    ? { ok: true, userId: '22222222-2222-4222-8222-222222222222' }
    : { ok: false, response: new Response(null, { status: 403 }) },
  getServiceSupabase: fixture.service,
}));

import { GET, POST } from './route';

const request = (tierId = 'silver') => new Request('http://localhost/api/admin/teachers/tier-acknowledgements', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ teacherId: fixture.teacher.id, tierId }),
});

beforeEach(() => {
  fixture.authorized = true;
  fixture.teacher.name = '강사';
  fixture.teacher.role = 'teacher';
  fixture.teacher.session_count = 51;
  fixture.count = 0;
  fixture.countError = false;
  fixture.writeError = false;
  fixture.upsert.mockReset().mockImplementation(async () => ({ error: fixture.writeError ? { message: 'write_failed' } : null }));
  fixture.service.mockReset().mockImplementation(() => ({
    from: (table: string) => {
      if (table === 'users') return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: fixture.teacher, error: null }) }) }) };
      if (table === 'session_count_logs') return { select: () => ({ eq: async () => ({ count: fixture.count, error: fixture.countError ? { message: 'count_failed' } : null }) }) };
      const query = {
        select: () => query,
        order: () => query,
        range: async () => ({ data: [{ teacher_id: fixture.teacher.id, tier_id: 'silver' }], error: null }),
        upsert: fixture.upsert,
      };
      return query;
    },
  }));
});

describe('shared tier acknowledgement', () => {
  it('denies both reads and writes before opening a service client', async () => {
    fixture.authorized = false;
    expect((await GET()).status).toBe(403);
    expect((await POST(request())).status).toBe(403);
    expect(fixture.service).not.toHaveBeenCalled();
  });

  it('returns shared confirmations without caching', async () => {
    const response = await GET();
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    expect(await response.json()).toEqual({ acknowledgements: [{ teacher_id: fixture.teacher.id, tier_id: 'silver' }] });
  });

  it('rejects rookie and invalid requests', async () => {
    expect((await POST(request('rookie'))).status).toBe(400);
    expect(fixture.upsert).not.toHaveBeenCalled();
  });

  it('excludes QA accounts even when they meet a threshold', async () => {
    fixture.teacher.name = 'SPOMOVE QA';
    expect((await POST(request())).status).toBe(404);
    expect(fixture.upsert).not.toHaveBeenCalled();
  });

  it('rejects a stale displayed tier instead of confirming the next tier', async () => {
    fixture.teacher.session_count = 105;
    fixture.count = 1;
    expect((await POST(request('silver'))).status).toBe(409);
    expect(fixture.upsert).not.toHaveBeenCalled();
  });

  it('stores each achieved tier separately and preserves the first confirmation', async () => {
    fixture.teacher.session_count = 105;
    fixture.count = 1;
    expect((await POST(request('gold'))).status).toBe(200);
    expect(fixture.upsert).toHaveBeenCalledWith({
      teacher_id: fixture.teacher.id, tier_id: 'gold', acknowledged_by: '22222222-2222-4222-8222-222222222222',
    }, { onConflict: 'teacher_id,tier_id', ignoreDuplicates: true });
  });

  it('does not confirm when lesson counts cannot be verified', async () => {
    fixture.countError = true;
    expect((await POST(request())).status).toBe(500);
    expect(fixture.upsert).not.toHaveBeenCalled();
  });

  it('does not report success when persistence fails', async () => {
    fixture.writeError = true;
    expect((await POST(request())).status).toBe(500);
  });
});
