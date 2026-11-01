import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
const mocks = vi.hoisted(() => ({ auth: vi.fn(), service: vi.fn(), rpc: vi.fn() }));
vi.mock('@/app/lib/server/adminAuth', () => ({ requireAdmin: mocks.auth, getServiceSupabase: mocks.service }));
import { POST } from './route';
const id = '70000000-0000-4000-8000-000000000001';
const input = { groupId: id, expected: [{ id, start_at: '2026-10-25T05:00:00Z', end_at: '2026-10-25T09:00:00Z', created_by: id, memo: null, price: 0, status: 'opened', round_index: 1, round_total: 1 }], removeIds: [id], roundUpdates: [] };
const request = (body: unknown = input) => new NextRequest('http://localhost/api/admin/classes/sessions/shrink', { method: 'POST', body: JSON.stringify(body) });
beforeEach(() => { vi.clearAllMocks(); mocks.auth.mockResolvedValue({ ok: true }); mocks.service.mockReturnValue({ rpc: mocks.rpc }); mocks.rpc.mockResolvedValue({ data: 1, error: null }); });
describe('atomic shrink API', () => {
  it('requires admin authorization', async () => { mocks.auth.mockResolvedValue({ ok: false, response: NextResponse.json({}, { status: 403 }) }); expect((await POST(request())).status).toBe(403); expect(mocks.service).not.toHaveBeenCalled(); });
  it('requires the complete saved-state baseline', async () => { expect((await POST(request({ ...input, expected: [{ id }] }))).status).toBe(400); expect(mocks.rpc).not.toHaveBeenCalled(); });
  it('delegates deletion and every round patch to one transaction', async () => { expect((await POST(request())).status).toBe(200); expect(mocks.rpc).toHaveBeenCalledOnce(); expect(mocks.rpc).toHaveBeenCalledWith('admin_apply_session_tail_shrink', { p_group_id: id, p_expected: input.expected, p_remove_ids: [id], p_round_updates: [] }); });
  it('rejects a stale transaction and a zero-row mutation', async () => { mocks.rpc.mockResolvedValueOnce({ data: null, error: { message: 'SESSION_SHRINK_STALE' } }); expect((await POST(request())).status).toBe(409); mocks.rpc.mockResolvedValueOnce({ data: 0, error: null }); expect((await POST(request())).status).toBe(409); });
});
