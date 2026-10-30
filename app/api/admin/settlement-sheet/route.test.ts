import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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
afterEach(() => vi.unstubAllEnvs());
describe('settlement preservation', () => {
  describe('Stage 1 local mapping only', () => {
    const uuid = '11111111-1111-4111-8111-111111111111';
    const linkRequest = (value: unknown) => request({ kind: 'center-link', value });
    beforeEach(() => vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'http://127.0.0.1:54321'));
    it('rejects remote databases before any table query', async () => {
      vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
      expect((await PUT(linkRequest({ id: 'p', rev: 'r', center_id: uuid }))).status).toBe(423);
      expect(mock.from).not.toHaveBeenCalled();
    });
    it('rejects invalid UUID and extra payload fields', async () => {
      expect((await PUT(linkRequest({ id: 'p', rev: 'r', center_id: 'invalid' }))).status).toBe(400);
      expect((await PUT(linkRequest({ id: 'p', rev: 'r', center_id: uuid, fee: 999 }))).status).toBe(400);
      expect(mock.from).not.toHaveBeenCalled();
    });
    it('rejects production even with a loopback URL and blocks the legacy mapping path', async () => {
      vi.stubEnv('NODE_ENV', 'production');
      expect((await PUT(linkRequest({ id: 'p', rev: 'r', center_id: uuid }))).status).toBe(423);
      const q = query({ payload: { fee: 123 }, revision: 'r' }); mock.from.mockReturnValue(q);
      expect((await PUT(request({ kind: 'center', value: { id: 'p', rev: 'r', center_id: uuid } }))).status).toBe(423);
      expect(q.update).not.toHaveBeenCalled();
    });
    it('rejects stale and duplicate assignments without mutation', async () => {
      const q = query({ payload: { center_id: uuid }, revision: 'r' }); mock.from.mockReturnValue(q);
      expect((await PUT(linkRequest({ id: 'p', rev: 'old', center_id: null }))).status).toBe(409);
      const duplicate = await PUT(linkRequest({ id: 'p', rev: 'r', center_id: uuid }));
      expect((await duplicate.json()).code).toBe('DUPLICATE_LINK');
      expect(q.update).not.toHaveBeenCalled();
    });
    it('preserves 52 centers, 59 policies, monthly originals and history across 1:N linking and unlinking', async () => {
      const centers = Array.from({ length: 52 }, (_, i) => ({ id: i ? `fixture-${i}` : uuid }));
      const policies = Array.from({ length: 59 }, (_, i) => ({ id: `p${i}`, payload: { fee: 123, rental: 456, cost: 789, legacy: { keep: true }, center_id: null as string | null }, revision: 'r' }));
      const months = [{ locked: true, rows: [{ fee: 321, centerId: 'p0' }] }];
      const original = structuredClone({ centers, months });
      for (const [index, next] of [[0, uuid], [1, uuid], [0, null]] as const) {
        const policy = policies[index]; const write = query({ id: policy.id });
        mock.from.mockReturnValueOnce(query(policy));
        if (next) mock.from.mockReturnValueOnce(query({ id: uuid }));
        mock.from.mockReturnValueOnce(write);
        expect((await PUT(linkRequest({ id: policy.id, rev: policy.revision, center_id: next }))).status).toBe(200);
        const saved = write.update.mock.calls[0][0];
        expect(saved.payload).toMatchObject({ fee: 123, rental: 456, cost: 789, legacy: { keep: true } });
        expect(saved.payload._centerLinkHistory.at(-1)).toMatchObject({ actor: 'admin', to: next, previousRevision: policy.revision });
        expect(write.eq).toHaveBeenCalledWith('revision', policy.revision);
        Object.assign(policy, saved);
      }
      expect(policies[1].payload.center_id).toBe(uuid); expect(policies[0].payload.center_id).toBeNull();
      expect(policies).toHaveLength(59); expect({ centers, months }).toEqual(original);
      expect(mock.from.mock.calls.some(([table]) => table === 'admin_settlement_sheet_months')).toBe(false);
    });
    it('handles nonexistent center and concurrent CAS conflict', async () => {
      mock.from.mockReturnValueOnce(query({ payload: {}, revision: 'r' })).mockReturnValueOnce(query(null));
      expect((await PUT(linkRequest({ id: 'p', rev: 'r', center_id: uuid }))).status).toBe(404);
      mock.from.mockReturnValueOnce(query({ payload: { center_id: uuid }, revision: 'r' })).mockReturnValueOnce(query(null));
      expect((await PUT(linkRequest({ id: 'p', rev: 'r', center_id: null }))).status).toBe(409);
    });
    it('keeps MASTER authorization for mapping writes', async () => {
      mock.auth.mockResolvedValue({ ok: true, email: 'other@example.test' });
      expect((await PUT(linkRequest({ id: 'p', rev: 'r', center_id: uuid }))).status).toBe(403);
      expect(mock.from).not.toHaveBeenCalled();
    });
  });
  it('omits policy query entirely on initial sheet load, retaining historical month snapshots', async () => {
    mock.from.mockReturnValueOnce(query([{ month_key: '2026-10', payload: { rows: [{ fee: 123, centerId: 'old' }] }, revision: 'r', locked: true }]))
      .mockReturnValueOnce(query({ payload: { year: 2026 } }));
    const body = await (await GET(new Request('http://local?scope=sheet'))).json();
    expect(body.centers).toEqual({}); expect(body.months['2026-10'].rows[0].fee).toBe(123);
    expect(mock.from.mock.calls.map(([table]) => table)).toEqual(['admin_settlement_sheet_months', 'admin_settlement_sheet_settings']);
  });
  it('connects a policy by operational UUID without changing amounts, private metadata or history', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'http://127.0.0.1:54321');
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
