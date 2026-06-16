import { describe, expect, it, vi } from 'vitest';

const { requireSpokeduMasterAccess } = vi.hoisted(() => ({
  requireSpokeduMasterAccess: vi.fn(),
}));

vi.mock('@/app/lib/server/spokeduMasterAccess', () => ({
  requireSpokeduMasterAccess,
}));

vi.mock('@/app/lib/server/adminAuth', () => ({
  getServiceSupabase: vi.fn(() => {
    throw new Error('Supabase should not be called for denied requests');
  }),
}));

import * as studentsRoute from './students/route';
import * as classRecordsRoute from './class-records/route';

describe('SPOKEDU MASTER operational routes auth contract', () => {
  it.each([
    ['students GET', () => studentsRoute.GET()],
    ['students POST', () => studentsRoute.POST(new Request('http://local', { method: 'POST', body: '{}' }))],
    ['class-records GET', () => classRecordsRoute.GET()],
    ['class-records POST', () => classRecordsRoute.POST(new Request('http://local', { method: 'POST', body: '{}' }))],
  ])('blocks unauthenticated %s', async (_label, invoke) => {
    requireSpokeduMasterAccess.mockResolvedValueOnce({
      ok: false,
      response: Response.json({ error: 'Unauthorized' }, { status: 401 }),
    });

    const response = await invoke();

    expect(response.status).toBe(401);
  });
});
