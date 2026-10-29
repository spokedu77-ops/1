import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextResponse } from 'next/server';
const mock = vi.hoisted(() => ({ auth: vi.fn(), service: vi.fn(), from: vi.fn() }));
vi.mock('@/app/lib/server/adminAuth', () => ({ requireAdmin: mock.auth, getServiceSupabase: mock.service }));
import { GET, PUT, DELETE } from './route';
function query(data: unknown) {
  const q: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const method of ['select', 'eq', 'order', 'maybeSingle', 'update', 'insert', 'upsert', 'delete', 'limit']) q[method] = vi.fn(() => q);
  q.then = vi.fn((resolve) => Promise.resolve({ data, error: null }).then(resolve));
  return q;
}
const request = (body: unknown) => new Request('http://local', { method: 'PUT', body: JSON.stringify(body) });
beforeEach(() => { vi.clearAllMocks(); mock.auth.mockResolvedValue({ ok: true, email: 'choijihoon@spokedu.com', userId: 'admin' }); mock.service.mockReturnValue({ from: mock.from }); });
describe('settlement preservation', () => {
  it('omits policy query entirely on initial sheet load, retaining historical month snapshots', async () => {
    mock.from.mockReturnValueOnce(query([{ month_key: '2026-10', payload: { rows: [{ fee: 123, centerId: 'old' }] }, revision: 'r', locked: true }]))
      .mockReturnValueOnce(query({ payload: { year: 2026 } }));
    const body = await (await GET(new Request('http://local?scope=sheet'))).json();
    expect(body.centers).toEqual({}); expect(body.months['2026-10'].rows[0].fee).toBe(123);
    expect(mock.from.mock.calls.map(([table]) => table)).toEqual(['admin_settlement_sheet_months', 'admin_settlement_sheet_settings']);
  });
  it('connects a policy by operational UUID without changing amounts, private metadata or history', async () => {
    const payload = { id: 'legacy-policy', name: '원래 이름', instr: 90, assist: 10, rental: 5, fee: 105, cost: 40, rates: [{ from: '2026-01', instr: 80 }], unknownLegacyKey: 'keep' };
    const current = query({ payload, revision: 'r' }); const center = query({ id: '11111111-1111-4111-8111-111111111111' }); const write = query({ id: 'legacy-policy' });
    mock.from.mockReturnValueOnce(current).mockReturnValueOnce(center).mockReturnValueOnce(write);
    const response = await PUT(request({ kind: 'center', value: { ...payload, rev: 'r', center_id: '11111111-1111-4111-8111-111111111111' } }));
    expect(response.status).toBe(200);
    expect(write.update.mock.calls[0][0].payload).toMatchObject(payload);
    expect(write.eq).toHaveBeenCalledWith('revision', 'r');
    expect(mock.from.mock.calls.some(([table]) => table === 'admin_settlement_sheet_months')).toBe(false);
  });
  it('rejects stale policy edits before writing', async () => {
    const q = query({ payload: {}, revision: 'new' }); mock.from.mockReturnValue(q);
    expect((await PUT(request({ kind: 'center', value: { id: 'old', rev: 'stale' } }))).status).toBe(409);
    expect(mock.from).toHaveBeenCalledTimes(1); expect(q.update).not.toHaveBeenCalled();
  });
  it('does not allow confirmed month edits disguised as unlocks', async () => {
    const q = query({ revision: 'r', locked: true, payload: { key: '2026-10', rows: [{ fee: 100 }] } }); mock.from.mockReturnValue(q);
    expect((await PUT(request({ kind: 'month', expectedRevision: 'r', value: { key: '2026-10', locked: false, rows: [{ fee: 999 }] } }))).status).toBe(423);
    expect(q.update).not.toHaveBeenCalled();
  });
  it('rejects replacement restore if any confirmed month exists, before mutating anything', async () => {
    const q = query([{ month_key: '2026-10' }]); mock.from.mockReturnValue(q);
    expect((await PUT(request({ kind: 'restore', value: { months: {}, centers: {}, settings: {} } }))).status).toBe(423);
    expect(q.upsert).not.toHaveBeenCalled(); expect(q.delete).not.toHaveBeenCalled();
  });
  it('requires master for every method', async () => {
    mock.auth.mockResolvedValue({ ok: true, email: 'other@example.test' });
    expect((await GET(new Request('http://local'))).status).toBe(403);
    expect((await PUT(request({}))).status).toBe(403);
    expect((await DELETE(new Request('http://local?kind=center&id=x'))).status).toBe(403);
    mock.auth.mockResolvedValue({ ok: false, response: NextResponse.json({}, { status: 401 }) });
    expect((await GET(new Request('http://local'))).status).toBe(401);
    expect(mock.service).not.toHaveBeenCalled();
  });
});
