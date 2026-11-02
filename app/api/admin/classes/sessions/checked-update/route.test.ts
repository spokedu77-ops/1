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
function db(result?: unknown, storedSession: Record<string, unknown> = { id, ...expected, feedback_fields: {}, photo_url: [], file_url: [] }) {
  const update = { eq: vi.fn(), is: vi.fn(), select: vi.fn(), maybeSingle: vi.fn() };
  update.eq.mockReturnValue(update); update.is.mockReturnValue(update); update.select.mockReturnValue(update);
  const patch = vi.fn((value: Record<string, unknown>) => {
    update.maybeSingle.mockResolvedValue(result ?? { data: { id, ...expected, ...value, round_index: 7 }, error: null });
    return update;
  });
  const read = { eq: vi.fn(), maybeSingle: vi.fn().mockResolvedValue({ data: storedSession, error: null }) };
  read.eq.mockReturnValue(read);
  mocks.service.mockReturnValue({ from: vi.fn((table: string) => table === 'users' ? {
    select: () => ({
      in: async () => ({ data: [{ id: assistant }], error: null }),
      order: () => ({ range: async () => ({ data: [{ id: main, role: 'teacher' }, { id: assistant, role: 'teacher' }], error: null }) }),
    }),
  } : { update: patch, select: () => read }) });
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
    expect(response.status).toBe(200); expect((await response.json()).session.round_index).toBe(7);
    for (const [key, value] of Object.entries(expected)) expect(update.eq).toHaveBeenCalledWith(key, value);
    expect(update.eq).toHaveBeenCalledWith('id', id);
    expect(patch.mock.calls[0][0].memo).toBe('note\nEXTRA_TEACHERS:' + JSON.stringify(input.assistants) + '\nPOSTPONE_SNAPSHOT:[{"untouched":true}]');
  });
  it('uses IS NULL rather than = NULL', async () => { const { update } = db(); await POST(request({ ...input, expected: { ...expected, price: null, memo: null, created_by: null } })); expect(update.is).toHaveBeenCalledWith('memo', null); expect(update.is).toHaveBeenCalledWith('price', null); });
  it.each([{ data: null, error: null }, { data: null, error: { code: '23P01', message: 'TEACHER_SCHEDULE_CONFLICT' } }])('rejects stale/missing rows and schedule conflicts', async (result) => { db(result); expect((await POST(request(input))).status).toBe(409); });
  it('does not interpret an RLS failure as a successful no-op', async () => { db({ data: null, error: { code: '42501', message: 'RLS' } }); expect((await POST(request(input))).status).toBe(403); });
  it('reports network failures as a server failure, not malformed metadata', async () => { db(); mocks.service.mockImplementation(() => { throw new Error('network'); }); const response = await POST(request(input)); expect(response.status).toBe(500); expect((await response.json()).error).toBe('SESSION_UPDATE_FAILED'); });
  it('never reports success when returned storage still contains the old assistant or price', async () => {
    db({ data: { id, ...expected }, error: null });
    const response = await POST(request(input));
    expect(response.status).toBe(409);
    expect((await response.json()).error).toBe('SESSION_UPDATE_UNVERIFIED');
  });
  it('reports invalid stored metadata as a data repair issue rather than a connection failure', async () => {
    db({ data: null, error: { code: '22023', message: 'SESSION_COUNT_EXTRA_TEACHERS_INVALID' } });
    const response = await POST(request({ ...input, assistants: [] }));
    expect(response.status).toBe(422);
    expect(await response.json()).toMatchObject({ error: 'SESSION_UPDATE_METADATA_INVALID', message: expect.any(String) });
  });
  it('surfaces count-ledger conflicts without reporting a successful deletion', async () => {
    db({ data: null, error: { code: '23514', message: 'SESSION_COUNT_SOURCE_AUTO_LOG_AMBIGUOUS' } });
    const response = await POST(request({ ...input, assistants: [] }));
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ error: 'SESSION_UPDATE_COUNT_CONFLICT' });
  });
  it.each([[{ id: '', price: 0 }], [{ id: main, price: 0 }], [{ id: assistant, price: 0 }, { id: assistant, price: 1 }]])('rejects incomplete or duplicate assignments without a write', async (...assistants) => { db(); const response = await POST(request({ ...input, assistants })); expect(response.status).toBe(400); });
  it('rejects a main-teacher change that duplicates an existing assistant', async () => { db(); const response = await POST(request({ sessionId: id, expected: { ...expected, memo: 'EXTRA_TEACHERS:' + JSON.stringify(input.assistants) }, patch: { created_by: assistant } })); expect(response.status).toBe(400); });
  it('does not allow arbitrary columns or an empty update', async () => { db(); expect((await POST(request({ sessionId: id, expected, patch: { status: 'verified' } }))).status).toBe(400); expect((await POST(request({ sessionId: id, expected, patch: {} }))).status).toBe(400); });
  it('rejects moving recorded teaching history to a future date before writing', async () => {
    const { patch } = db(undefined, { id, ...expected, start_at: '2026-09-07T05:00:00Z', status: 'verified', feedback_fields: { main_activity: 'historical activity' } });
    const response = await POST(request({ sessionId: id, expected, patch: { start_at: '2099-12-01T05:00:00Z' } }));
    expect(response.status).toBe(409);
    expect((await response.json()).error).toBe('SESSION_RECORDED_SCHEDULE_MOVE_FORBIDDEN');
    expect(patch).not.toHaveBeenCalled();
  });
});
