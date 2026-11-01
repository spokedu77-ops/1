import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ user: vi.fn(), service: vi.fn() }));
vi.mock('@/app/lib/supabase/server', () => ({ createServerSupabaseClient: async () => ({ auth: { getUser: mocks.user } }) }));
vi.mock('@/app/lib/server/adminAuth', () => ({ getServiceSupabase: mocks.service }));
import { GET } from './route';
const uid = '70000000-0000-4000-8000-000000000001';
function database(error = false) {
  const old = 'EXTRA_TEACHERS:' + JSON.stringify([{ id: uid, price: 25000 }]);
  const data = [{ id: 'cleared', memo: 'POSTPONE_SNAPSHOT:' + JSON.stringify([{ memo: old }]) + '\nEXTRA_TEACHERS:[]', students_text: old, status: 'finished', start_at: '2026-10-21T00:00:00Z' }];
  mocks.service.mockReturnValue({ from: (table: string) => {
    let main = false;
    const query = { select: () => query, eq: () => { main = true; return query; }, in: () => query, order: () => query, ilike: () => query,
      range: async () => ({ data: table === 'settlements' || main ? [] : data, error: error ? { message: 'DB unavailable' } : null }) };
    return query;
  } });
}
beforeEach(() => { vi.clearAllMocks(); mocks.user.mockResolvedValue({ data: { user: { id: uid } } }); });
describe('teacher payroll cannot revive removed assistants or hide failed reads', () => {
  it('excludes an explicitly removed assistant despite old students_text data', async () => { database(); const response = await GET(); expect(response.status).toBe(200); expect((await response.json()).data).toEqual([]); });
  it('returns an error rather than an empty successful payroll when a read fails', async () => { database(true); expect((await GET()).status).toBe(500); });
  it('requires a logged-in user', async () => { mocks.user.mockResolvedValue({ data: { user: null } }); expect((await GET()).status).toBe(401); expect(mocks.service).not.toHaveBeenCalled(); });
});
