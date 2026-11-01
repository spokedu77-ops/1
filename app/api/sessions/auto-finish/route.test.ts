import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextResponse } from 'next/server';

const mocks = vi.hoisted(() => ({ auth: vi.fn(), service: vi.fn() }));
vi.mock('@/app/lib/server/adminAuth', () => ({ requireAdmin: mocks.auth, getServiceSupabase: mocks.service }));
import { POST } from './route';

function database(read: { data: Record<string, unknown>[] | null; error: unknown }, results: Record<string, unknown> = {}) {
  const updates: { predicates: Record<string, unknown>; patch: unknown }[] = [];
  const select = { lt: vi.fn(), eq: vi.fn(), order: vi.fn(), limit: vi.fn().mockResolvedValue(read) };
  select.lt.mockReturnValue(select); select.eq.mockReturnValue(select); select.order.mockReturnValue(select);
  mocks.service.mockReturnValue({ from: () => ({
    select: () => select,
    update: (patch: unknown) => {
      const predicates: Record<string, unknown> = {};
      updates.push({ patch, predicates });
      const query = {
        eq: (key: string, value: unknown) => { predicates[key] = value; return query; },
        is: (key: string, value: unknown) => { predicates[key] = value; return query; },
        lt: vi.fn(), or: vi.fn(), select: vi.fn(),
        maybeSingle: async () => {
          const result = results[String(predicates.id)];
          if (result instanceof Error) throw result;
          return result ?? { data: { id: predicates.id }, error: null };
        },
      };
      query.lt.mockReturnValue(query); query.or.mockReturnValue(query); query.select.mockReturnValue(query);
      return query;
    },
  }) });
  return updates;
}
const row = (id: string) => ({ id, title: id, status: 'opened', memo: 'original', price: 60000, created_by: 'main', start_at: '2026-10-31T03:00:00Z', end_at: '2026-10-31T05:00:00Z', updated_at: '2026-10-21T00:00:00Z' });
beforeEach(() => { vi.clearAllMocks(); vi.spyOn(console, 'error').mockImplementation(() => undefined); mocks.auth.mockResolvedValue({ ok: true }); });

describe('automatic completion isolates failures and reports committed rows', () => {
  it('does not access service data before admin authorization', async () => {
    mocks.auth.mockResolvedValue({ ok: false, response: NextResponse.json({}, { status: 403 }) });
    expect((await POST()).status).toBe(403);
    expect(mocks.service).not.toHaveBeenCalled();
  });
  it('does not report a failed read as zero successful candidates', async () => {
    const updates = database({ data: null, error: { message: 'offline' } });
    const response = await POST();
    expect(response.status).toBe(500); expect((await response.json()).ok).toBe(false); expect(updates).toEqual([]);
  });
  it('continues after a bad assistant and counts only actual returned rows', async () => {
    const updates = database({ data: [row('bad'), row('good'), row('changed')], error: null }, {
      bad: { data: null, error: { code: '22023', message: 'SESSION_COUNT_EXTRA_TEACHERS_INVALID' } },
      changed: { data: null, error: null },
    });
    const response = await POST(); const body = await response.json();
    expect(response.status).toBe(207);
    expect(body).toMatchObject({ ok: false, count: 1, updatedIds: ['good'], skippedIds: ['changed'], failures: [{ id: 'bad', code: '22023' }] });
    expect(updates).toHaveLength(3);
    const baseline = Object.fromEntries(Object.entries(row('good')).filter(([key]) => key !== 'title'));
    expect(updates[1].predicates).toEqual(baseline);
  });
  it('identifies the real empty assistant draft without attempting a doomed write', async () => {
    const updates = database({ data: [{ ...row('bad-draft'), memo: 'EXTRA_TEACHERS:[{"id":"","price":0}]' }, row('good')], error: null });
    const response = await POST();
    expect(response.status).toBe(207);
    expect(await response.json()).toMatchObject({ ok: false, status: 'needs-review', count: 1, failures: [{ id: 'bad-draft', code: 'SESSION_ASSISTANTS_INVALID' }] });
    expect(updates).toHaveLength(1);
    expect(updates[0].predicates.id).toBe('good');
  });
  it('does not let a network exception stop later sessions', async () => {
    database({ data: [row('offline'), row('good')], error: null }, { offline: new Error('offline') });
    expect(await (await POST()).json()).toMatchObject({ ok: false, count: 1, updatedIds: ['good'] });
  });
  it('returns zero for concurrent changes, never an optimistic count', async () => {
    database({ data: [row('changed')], error: null }, { changed: { data: null, error: null } });
    expect(await (await POST()).json()).toMatchObject({ ok: true, count: 0, skippedIds: ['changed'] });
  });
  it('reports an empty successful scan', async () => {
    database({ data: [], error: null });
    expect(await (await POST()).json()).toMatchObject({ ok: true, count: 0, failures: [] });
    expect(mocks.service.mock.results[0].value.from().select().eq).toHaveBeenCalledWith('status', 'opened');
  });
});
