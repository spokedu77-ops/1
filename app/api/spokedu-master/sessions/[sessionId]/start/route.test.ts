import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  reads: [] as Array<{ data: unknown; error: unknown }>,
  updates: [] as Array<{ data: unknown; error: unknown }>,
  eq: vi.fn(),
  update: vi.fn(),
}));

vi.mock('@/app/lib/server/spokeduMasterAccess', () => ({
  requireSpokeduMasterCapability: vi.fn(async () => ({ ok: true, userId: 'owner-1', plan: 'pro' })),
}));
vi.mock('@/app/lib/server/adminAuth', () => ({
  getServiceSupabase: () => ({
    from: () => {
      let updating = false;
      const chain = {
        select: vi.fn(() => chain),
        eq: vi.fn((field: string, value: string) => { mocks.eq(field, value); return chain; }),
        is: vi.fn(() => chain),
        update: vi.fn((value: unknown) => { updating = true; mocks.update(value); return chain; }),
        maybeSingle: vi.fn(async () => (updating ? mocks.updates.shift() : mocks.reads.shift()) ?? { data: null, error: null }),
      };
      return chain;
    },
  }),
}));

import { POST } from './route';

const context = (sessionId = 'session-1') => ({ params: Promise.resolve({ sessionId }) });
const request = new Request('http://localhost/start', { method: 'POST' });

describe('POST session start', () => {
  beforeEach(() => {
    mocks.reads.length = 0;
    mocks.updates.length = 0;
    mocks.eq.mockClear();
    mocks.update.mockClear();
  });

  it('records the first explicit start and scopes both read and update to owner', async () => {
    mocks.reads.push({ data: { id: 'session-1', status: 'scheduled', started_at: null }, error: null });
    mocks.updates.push({ data: { id: 'session-1', started_at: '2026-08-28T12:00:00.000Z' }, error: null });
    const response = await POST(request, context());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: { sessionId: 'session-1', startedAt: '2026-08-28T12:00:00.000Z' } });
    expect(mocks.eq).toHaveBeenCalledWith('owner_id', 'owner-1');
    expect(mocks.update).toHaveBeenCalledTimes(1);
  });

  it('is idempotent and preserves the first timestamp', async () => {
    mocks.reads.push({ data: { id: 'session-1', status: 'scheduled', started_at: '2026-08-28T11:00:00.000Z' }, error: null });
    const response = await POST(request, context());
    expect((await response.json()).data.startedAt).toBe('2026-08-28T11:00:00.000Z');
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it.each(['completed', 'cancelled'] as const)('rejects %s sessions', async (status) => {
    mocks.reads.push({ data: { id: 'session-1', status, started_at: null }, error: null });
    expect((await POST(request, context())).status).toBe(409);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it('does not reveal a session outside the owner scope', async () => {
    mocks.reads.push({ data: null, error: null });
    expect((await POST(request, context('other-session'))).status).toBe(404);
    expect(mocks.eq).toHaveBeenCalledWith('owner_id', 'owner-1');
  });

  it('returns the winner timestamp after a concurrent idempotent start', async () => {
    mocks.reads.push(
      { data: { id: 'session-1', status: 'scheduled', started_at: null }, error: null },
      { data: { id: 'session-1', status: 'scheduled', started_at: '2026-08-28T10:00:00.000Z' }, error: null },
    );
    mocks.updates.push({ data: null, error: null });
    const response = await POST(request, context());
    expect((await response.json()).data.startedAt).toBe('2026-08-28T10:00:00.000Z');
  });
});
