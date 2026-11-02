import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
const mocks = vi.hoisted(() => ({ auth: vi.fn(), service: vi.fn() }));
vi.mock('@/app/lib/server/adminAuth', () => ({ requireAdmin: mocks.auth, getServiceSupabase: mocks.service }));
import { POST } from './route';
const id = '70000000-0000-4000-8000-000000000001';
const changes = [{ id, price: 0, expected: { price: 25000 } }];
const request = () => new NextRequest('http://localhost/api/admin/classes/sessions/bulk-update', { method: 'POST', body: JSON.stringify({ changes }) });
function database(updated: unknown = 1, rows: unknown = [{ id, price: 0 }], error: unknown = null) {
  const rpc = vi.fn().mockResolvedValue({ data: updated, error });
  mocks.service.mockReturnValue({ rpc, from: (table: string) => ({ select: (columns: string) => ({
    in: async () => ({ data: columns === '*' ? rows : [{ id, price: 25000, start_at: '2026-12-01T01:00:00Z', status: 'opened' }], error: null }),
    order: () => ({ range: async () => ({ data: table === 'users' ? [] : rows, error: null }) }),
  }) }) });
  return rpc;
}
beforeEach(() => { vi.clearAllMocks(); mocks.auth.mockResolvedValue({ ok: true }); });
describe('bulk save completion requires actual stored values', () => {
  it('does not acquire privileged client when unauthorized', async () => {
    mocks.auth.mockResolvedValue({ ok: false, response: NextResponse.json({}, { status: 403 }) });
    expect((await POST(request())).status).toBe(403); expect(mocks.service).not.toHaveBeenCalled();
  });
  it('accepts an actual stored zero fee', async () => { const rpc = database(); const response = await POST(request()); expect(response.status).toBe(200); expect(rpc).toHaveBeenCalledWith('admin_apply_session_checked_changes', { p_changes: changes }); });
  it.each([[0, []], [1, []], [1, [{ id, price: 25000 }]]])('rejects missing writes or stale reloads (%s)', async (count, rows) => { database(count, rows); expect((await POST(request())).status).toBe(409); });
  it('returns a stale transaction failure instead of success', async () => { database(null, [], { message: 'SESSION_UPDATE_STALE' }); expect((await POST(request())).status).toBe(409); });
});
