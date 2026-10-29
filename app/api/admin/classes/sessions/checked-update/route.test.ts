import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
const mocks = vi.hoisted(() => ({ auth: vi.fn(), service: vi.fn() }));
vi.mock('@/app/lib/server/adminAuth', () => ({ requireAdmin: mocks.auth, getServiceSupabase: mocks.service }));
import { POST } from './route';
const id = '70000000-0000-4000-8000-000000000001';
const main = '70000000-0000-4000-8000-000000000002';
const assistant = '70000000-0000-4000-8000-000000000003';
const expected = { start_at: '2026-12-01T01:00:00Z', end_at: '2026-12-01T02:00:00Z', created_by: main, price: 0, status: 'opened', memo: 'note\nEXTRA_TEACHERS:[]\nPOSTPONE_SNAPSHOT:[{"untouched":true}]' };
const request = (body: unknown) => new NextRequest('http://localhost/api/admin/classes/sessions/checked-update', { method: 'POST', body: JSON.stringify(body) });
const input = { sessionId: id, expected, assistants: [{ id: assistant, price: 0 }] };
function db(result: unknown = { data: { id, memo: 'actual database row' }, error: null }) {
  const update = { eq: vi.fn(), is: vi.fn(), select: vi.fn(), maybeSingle: vi.fn().mockResolvedValue(result) };
  update.eq.mockReturnValue(update); update.is.mockReturnValue(update); update.select.mockReturnValue(update);
  const patch = vi.fn().mockReturnValue(update);
  mocks.service.mockReturnValue({ from: vi.fn((table: string) => table === 'users' ? { select: () => ({ in: async () => ({ data: [{ id: assistant }], error: null }) }) } : { update: patch }) });
  return { update, patch };
}
beforeEach(() => { vi.clearAllMocks(); mocks.auth.mockResolvedValue({ ok: true, userId: main }); });
describe('checked session save', () => {
  it('requires existing admin authentication before using the service client', async () => {
    mocks.auth.mockResolvedValue({ ok: false, response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) });
    expect((await POST(request(input))).status).toBe(403); expect(mocks.service).not.toHaveBeenCalled();
  });
  it('uses all baseline fields in the atomic predicate and returns stored data', async () => {
    const { update, patch } = db(); const response = await POST(request(input));
    expect(response.status).toBe(200); expect((await response.json()).session.memo).toBe('actual database row');
    for (const [key, value] of Object.entries(expected)) expect(update.eq).toHaveBeenCalledWith(key, value);
    expect(update.eq).toHaveBeenCalledWith('id', id);
    expect(patch.mock.calls[0][0].memo).toBe('note\nEXTRA_TEACHERS:' + JSON.stringify(input.assistants) + '\nPOSTPONE_SNAPSHOT:[{"untouched":true}]');
  });
  it('uses IS NULL rather than = NULL', async () => { const { update } = db(); await POST(request({ ...input, expected: { ...expected, price: null, memo: null, created_by: null } })); expect(update.is).toHaveBeenCalledWith('memo', null); expect(update.is).toHaveBeenCalledWith('price', null); });
  it.each([{ data: null, error: null }, { data: null, error: { code: '23P01', message: 'TEACHER_SCHEDULE_CONFLICT' } }])('rejects stale/missing rows and schedule conflicts', async (result) => { db(result); expect((await POST(request(input))).status).toBe(409); });
  it('does not interpret an RLS failure as a successful no-op', async () => { db({ data: null, error: { code: '42501', message: 'RLS' } }); expect((await POST(request(input))).status).toBe(403); });
  it('reports network failures as a server failure, not malformed metadata', async () => { db(); mocks.service.mockImplementation(() => { throw new Error('network'); }); const response = await POST(request(input)); expect(response.status).toBe(500); expect((await response.json()).error).toBe('SESSION_UPDATE_FAILED'); });
  it.each([[{ id: '', price: 0 }], [{ id: main, price: 0 }], [{ id: assistant, price: 0 }, { id: assistant, price: 1 }]])('rejects incomplete or duplicate assignments without a write', async (...assistants) => { db(); const response = await POST(request({ ...input, assistants })); expect(response.status).toBe(400); });
  it('rejects a main-teacher change that duplicates an existing assistant', async () => { db(); const response = await POST(request({ sessionId: id, expected: { ...expected, memo: 'EXTRA_TEACHERS:' + JSON.stringify(input.assistants) }, patch: { created_by: assistant } })); expect(response.status).toBe(400); });
  it('does not allow arbitrary columns or an empty update', async () => { db(); expect((await POST(request({ sessionId: id, expected, patch: { status: 'verified' } }))).status).toBe(400); expect((await POST(request({ sessionId: id, expected, patch: {} }))).status).toBe(400); });
});
