import { describe, expect, it } from 'vitest';
import { paginateMasterAdminGrantSearchRows, paginateMasterAdminRows, readAllMasterAdminIdRows, readAllMasterAdminPages, selectActiveMasterAdminGrants, selectLatestMasterAdminOrders } from './spokeduMasterAdminRead';

const makeIds = (count: number) => Array.from({ length: count }, (_, index) => 'user-' + index);

describe('MASTER ADMIN executable read core', () => {
  it.each([1, 20, 21, 1000, 1001, 2001])('reads all Auth/profile pages for %i members', async (count) => {
    const source = makeIds(count);
    let calls = 0;
    const rows = await readAllMasterAdminPages({ fetchPage: async (page, size) => {
      calls += 1;
      return source.slice((page - 1) * size, page * size);
    } });
    expect(rows).toEqual(source);
    expect(calls).toBe(Math.floor(count / 1000) + 1);
  });

  it('crosses 200-id batches and a 1,000-row result boundary', async () => {
    const sourceIds = makeIds(401);
    const seenBatches = new Set<string>();
    const rows = await readAllMasterAdminIdRows({ ids: sourceIds, fetchPage: async (batch, from, to) => {
      seenBatches.add(batch[0]);
      const all = batch.flatMap((id) => Array.from({ length: id === 'user-199' ? 1201 : 1 }, (_, index) => ({ id: id + '-' + index })));
      return all.slice(from, to + 1);
    } });
    expect(rows).toHaveLength(1601);
    expect(new Set(rows.map((row) => row.id)).size).toBe(1601);
    expect([...seenBatches]).toEqual(['user-0', 'user-200', 'user-400']);
  });

  it('rejects instead of returning partial rows when a middle batch fails', async () => {
    await expect(readAllMasterAdminIdRows({ ids: makeIds(401), fetchPage: async (batch) => {
      if (batch[0] === 'user-200') throw new Error('middle batch failed');
      return batch;
    } })).rejects.toThrow('middle batch failed');
  });

  it('selects Premium first and the later end within the same plan', () => {
    const rows = [
      { id: 'a', user_id: 'u1', plan: 'lite', starts_at: '2026-01-01', ends_at: '2027-12-01' },
      { id: 'b', user_id: 'u1', plan: 'premium', starts_at: '2026-01-01', ends_at: '2027-11-01' },
      { id: 'c', user_id: 'u2', plan: 'lite', starts_at: '2026-01-01', ends_at: '2027-11-01' },
      { id: 'd', user_id: 'u2', plan: 'lite', starts_at: '2026-01-01', ends_at: '2027-12-01' },
    ];
    const selected = selectActiveMasterAdminGrants(rows, '2026-10-09');
    expect(selected.get('u1')?.id).toBe('b');
    expect(selected.get('u2')?.id).toBe('d');
  });

  it('uses order id as the deterministic same-time tie breaker', () => {
    const selected = selectLatestMasterAdminOrders([
      { id: 'a', user_id: 'u1', updated_at: '2026-10-09' },
      { id: 'c', user_id: 'u1', updated_at: '2026-10-09' },
      { id: 'b', user_id: 'u1', updated_at: '2026-10-08' },
    ]);
    expect(selected.get('u1')?.id).toBe('c');
  });

  it.each([1, 20, 21, 1000, 1001, 2001])('keeps page totals without omissions for %i members', (count) => {
    const source = makeIds(count);
    const pageCount = Math.ceil(count / 20);
    const pages = Array.from({ length: pageCount }, (_, index) => paginateMasterAdminRows(source, index + 1));
    expect(pages[0].total).toBe(count);
    expect(pages.at(-1)?.total).toBe(count);
    expect(new Set(pages.flatMap((page) => page.rows)).size).toBe(count);
  });
  it('deduplicates, globally sorts, filters, and paginates grant search results', () => {
    const rows = Array.from({ length: 1001 }, (_, index) => ({ id: 'grant-' + index, plan: index % 2 ? 'lite' : 'premium', created_at: new Date(Date.UTC(2026, 0, 1, 0, 0, index)).toISOString(), state: index % 3 ? 'active' : 'expired' }));
    rows.push(rows[400]);
    const first = paginateMasterAdminGrantSearchRows({ rows, plan: 'premium', status: 'active', statusOf: (row) => row.state, page: 1 });
    const last = paginateMasterAdminGrantSearchRows({ rows, plan: 'premium', status: 'active', statusOf: (row) => row.state, page: Math.ceil(first.total / 20) });
    expect(first.total).toBe(334); expect(first.rows).toHaveLength(20); expect(last.rows).toHaveLength(14);
    expect(Date.parse(first.rows[0].created_at)).toBeGreaterThan(Date.parse(first.rows[1].created_at));
  });

});
