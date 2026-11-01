import { beforeEach, describe, expect, it, vi } from 'vitest';
const mock = vi.hoisted(() => ({ auth: vi.fn(), read: vi.fn(), service: vi.fn() }));
vi.mock('@/app/lib/server/adminAuth', () => ({ requireAdmin: mock.auth, getServiceSupabase: mock.service }));
vi.mock('../settlement-sheet/route', () => ({ GET: mock.read }));
import { GET, PUT, POST, PATCH, DELETE } from './route';
beforeEach(() => { vi.clearAllMocks(); mock.auth.mockResolvedValue({ ok: true, email: 'choijihoon@spokedu.com' }); });
describe('LAB read-only boundary', () => {
  it('requires MASTER before reading any snapshot or policy data', async () => {
    for (const scope of ['', '?scope=centers']) {
      mock.auth.mockResolvedValue({ ok: false, response: new Response(null, { status: 401 }) });
      expect((await GET(new Request('http://local'+scope))).status).toBe(401);
      mock.auth.mockResolvedValue({ ok: true, email: 'other@example.test' });
      expect((await GET(new Request('http://local'+scope))).status).toBe(403);
    }
    expect(mock.read).not.toHaveBeenCalled(); expect(mock.service).not.toHaveBeenCalled();
  });
  it('reuses the stable GET only for read, preserving snapshot response', async () => {
    mock.read.mockResolvedValue(new Response(JSON.stringify({ months: { original: true } })));
    const request = new Request('http://local');
    expect(await (await GET(request)).json()).toEqual({ months: { original: true } });
    expect(mock.read).toHaveBeenCalledWith(request);
  });
  it('rejects every write without forwarding to auth, database or stable API', async () => {
    for (const write of [PUT, POST, PATCH, DELETE]) expect((await write()).status).toBe(405);
    expect(mock.read).not.toHaveBeenCalled(); expect(mock.service).not.toHaveBeenCalled(); expect(mock.auth).not.toHaveBeenCalled();
  });
});
