import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextResponse } from 'next/server';
const mock = vi.hoisted(() => ({ auth: vi.fn(), service: vi.fn(), from: vi.fn() }));
vi.mock('@/app/lib/server/adminAuth', () => ({ requireAdmin: mock.auth, getServiceSupabase: mock.service }));
import { GET } from './route';
const id = '11111111-1111-4111-8111-111111111111';
function query(data: unknown) {
  const q: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const method of ['select', 'eq', 'ilike', 'order', 'limit', 'in', 'maybeSingle']) q[method] = vi.fn(() => q);
  q.then = vi.fn((resolve) => Promise.resolve({ data, error: null }).then(resolve));
  return q;
}
beforeEach(() => { vi.clearAllMocks(); mock.auth.mockResolvedValue({ ok: true, email: 'choijihoon@spokedu.com' }); mock.service.mockReturnValue({ from: mock.from }); });
describe('settlement operational center lookup', () => {
  it('blocks anon and non-master admins without touching service data', async () => {
    mock.auth.mockResolvedValueOnce({ ok: false, response: NextResponse.json({}, { status: 401 }) });
    expect((await GET(new Request('http://local?q=x'))).status).toBe(401);
    mock.auth.mockResolvedValueOnce({ ok: true, email: 'other@example.test' });
    expect((await GET(new Request('http://local?q=x'))).status).toBe(403);
    expect(mock.service).not.toHaveBeenCalled();
  });
  it('searches minimal fields and batches link lookup rather than loading all policies', async () => {
    const centers = query([{ id, name: '동명센터', status: 'active' }]); const links = query([{ id: 'policy-1', center_id: id }]);
    mock.from.mockReturnValueOnce(centers).mockReturnValueOnce(links);
    const response = await GET(new Request('http://local?q=동명'));
    expect(await response.json()).toEqual({ centers: [{ id, name: '동명센터', status: 'active', linked: true }] });
    expect(centers.select).toHaveBeenCalledWith('id,name,status');
    expect(links.in).toHaveBeenCalledWith('payload->>center_id', [id]);
    expect(links.select).toHaveBeenCalledWith('id,center_id:payload->>center_id');
    expect(response.headers.get('Cache-Control')).toContain('no-store');
  });
  it('only selected ID gets contract/reference fee, never contacts or sensitive files', async () => {
    const q = query({ id, session_fee: 100000 }); mock.from.mockReturnValue(q);
    const response = await GET(new Request(`http://local?id=${id}`));
    expect(response.status).toBe(200);
    expect(q.eq).toHaveBeenCalledWith('id', id);
    expect(q.select).toHaveBeenCalledWith('id,name,status,contract_start,contract_end,session_fee,updated_at');
    expect(mock.from).toHaveBeenCalledTimes(1);
  });
  it('rejects invalid IDs before querying and does not list all centers for empty search', async () => {
    expect((await GET(new Request('http://local?id=not-uuid'))).status).toBe(400);
    expect(await (await GET(new Request('http://local?q='))).json()).toEqual({ centers: [] });
    expect(mock.from).not.toHaveBeenCalled();
  });
});
