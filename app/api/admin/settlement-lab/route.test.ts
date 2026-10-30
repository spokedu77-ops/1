import { beforeEach, describe, expect, it, vi } from 'vitest';
const mock = vi.hoisted(() => ({ auth: vi.fn(), read: vi.fn(), service: vi.fn(), from: vi.fn() }));
vi.mock('@/app/lib/server/adminAuth', () => ({ requireAdmin: mock.auth, getServiceSupabase: mock.service }));
vi.mock('../settlement-sheet/route', () => ({ GET: mock.read }));
import { GET, PUT, POST, PATCH, DELETE } from './route';
beforeEach(() => { vi.clearAllMocks(); mock.auth.mockResolvedValue({ ok: true, email: 'choijihoon@spokedu.com' }); });
describe('LAB read-only boundary', () => {
  it('requires MASTER before reading any snapshot or center context', async () => {
    for (const scope of ['', '?scope=context']) {
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
  it('returns only center linkage and fee context with no mutation queries', async () => {
    const q = { select: vi.fn(), order: vi.fn() }; q.select.mockReturnValue(q); q.order.mockResolvedValue({ data: [{ id: 'uuid', session_fee: 100000 }], error: null });
    mock.from.mockReturnValue(q); mock.service.mockReturnValue({ from: mock.from });
    expect((await GET(new Request('http://local?scope=context'))).status).toBe(200);
    expect(q.select).toHaveBeenCalledWith('id,name,session_fee,main_teacher_id,main_teacher_2_id,main_teacher_3_id');
    expect(mock.read).not.toHaveBeenCalled();
  });
  it('rejects every write without forwarding to auth, database or stable API', async () => {
    for (const write of [PUT, POST, PATCH, DELETE]) expect((await write()).status).toBe(405);
    expect(mock.read).not.toHaveBeenCalled(); expect(mock.service).not.toHaveBeenCalled(); expect(mock.auth).not.toHaveBeenCalled();
  });
});
