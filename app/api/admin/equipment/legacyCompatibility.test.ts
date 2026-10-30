import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET as stock } from './stock/route';
import { GET as teachers } from './teachers/route';
import { GET as rentals } from './rentals/route';
import { GET as history } from './history/route';
import * as stockReader from '@/app/lib/equipment/fetchStock';

const state = vi.hoisted(() => ({
  ledger: false,
  allowed: true,
  rows: {} as Record<string, Record<string, unknown>[]>,
  tables: [] as string[],
  failTable: '',
  service: vi.fn(),
}));
vi.mock('@/app/lib/equipment/writeMode', () => ({ isLedgerWriteMode: () => state.ledger }));
vi.mock('@/app/lib/server/adminAuth', () => ({
  requireAdmin: async () => state.allowed ? { ok: true } : { ok: false, response: new Response(null, { status: 403 }) },
  getServiceSupabase: () => state.service(),
}));

// Production's pre-ledger schema: no new columns, tables, views, or RPCs.
const columns: Record<string, string[]> = {
  catalog: ['id', 'name', 'category', 'image', 'simple_desc', 'key_points', 'usage_examples'],
  users: ['id', 'name', 'role', 'is_active'],
  inventory: ['id', 'user_id', 'name', 'quantity'],
  inventory_logs: ['id', 'user_id', 'content', 'type', 'created_at'],
};
const request = (path: string) => new Request(`http://localhost/api/admin/equipment/${path}`);

beforeEach(() => {
  vi.restoreAllMocks();
  state.ledger = false;
  state.allowed = true;
  state.failTable = '';
  state.tables = [];
  state.rows = {
    catalog: [
      { id: 11, name: '같은 이름', category: 'A', image: null, simple_desc: null, key_points: null, usage_examples: null },
      { id: 22, name: '같은 이름', category: 'B', image: null, simple_desc: null, key_points: null, usage_examples: null },
    ],
    users: [
      { id: 'teacher-a', name: '강사 A', role: 'teacher', is_active: true },
      { id: 'teacher-b', name: '강사 B', role: 'teacher', is_active: true },
      { id: 'inactive', name: '비활성', role: 'teacher', is_active: false },
    ],
    inventory: [
      { id: 101, user_id: 'teacher-a', name: '같은 이름', quantity: 2 },
      { id: 102, user_id: 'teacher-a', name: '같은 이름', quantity: 3 },
      { id: 103, user_id: 'teacher-b', name: '같은 이름', quantity: 7 },
    ],
    inventory_logs: [
      { id: 1, user_id: 'teacher-a', content: '원본 지급 기록', type: 'in', created_at: '2026-10-30T01:00:00Z' },
      { id: 2, user_id: 'teacher-b', content: '다른 강사 기록', type: 'out', created_at: '2026-10-30T02:00:00Z' },
      { id: 3, user_id: 'teacher-a', content: '원본 회수 기록', type: 'out', created_at: '2026-10-30T03:00:00Z' },
    ],
  };
  state.service.mockReset().mockReturnValue({
    from(table: string) {
      state.tables.push(table);
      let invalid = !columns[table] || state.failTable === table;
      const filters: ((row: Record<string, unknown>) => boolean)[] = [];
      let bounds = [0, Infinity];
      let sortKey = '';
      let ascending = true;
      const query: Record<string, unknown> = {};
      query.select = (selection: string) => {
        invalid ||= selection.split(',').some((column) => !columns[table]?.includes(column.trim()));
        return query;
      };
      query.eq = (key: string, value: unknown) => { filters.push((row) => row[key] === value); return query; };
      query.in = (key: string, values: unknown[]) => { filters.push((row) => values.includes(row[key])); return query; };
      query.order = (key: string, options?: { ascending?: boolean }) => { sortKey = key; ascending = options?.ascending !== false; return query; };
      query.range = (start: number, end: number) => { bounds = [start, end]; return query; };
      query.then = (resolve: (result: unknown) => unknown, reject: (reason: unknown) => unknown) => {
        const rows = (state.rows[table] ?? []).filter((row) => filters.every((filter) => filter(row)));
        if (sortKey) rows.sort((a, b) => String(a[sortKey]).localeCompare(String(b[sortKey]), undefined, { numeric: true }) * (ascending ? 1 : -1));
        return Promise.resolve({ data: invalid ? null : rows.slice(bounds[0], bounds[1] + 1), error: invalid ? { message: 'missing relation or column' } : null }).then(resolve, reject);
      };
      return query;
    },
  });
});

describe('existing equipment data without a ledger migration', () => {
  it('loads the real catalog without fabricating stock totals or merging duplicate names', async () => {
    const response = await stock();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data_source).toBe('legacy');
    expect(body.capabilities.ledger_writes).toBe(false);
    expect(body.items).toEqual([]);
    expect(body.catalog_items.map((item: { catalog_id: number }) => item.catalog_id)).toEqual([11, 22]);
    expect(body.catalog_items[0]).not.toHaveProperty('qty_on_hand_total');
    expect(state.tables).toEqual(['catalog']);
    expect(response.headers.get('cache-control')).toContain('no-store');
  });

  it('summarizes holdings by owner ID, retaining separate same-name inventory records', async () => {
    const response = await teachers();
    expect(response.status).toBe(200);
    expect((await response.json()).items).toEqual([
      { id: 'teacher-a', name: '강사 A', role: 'teacher', inventory_item_count: 2, inventory_total_held: 5 },
      { id: 'teacher-b', name: '강사 B', role: 'teacher', inventory_item_count: 1, inventory_total_held: 7 },
    ]);
    expect(state.tables).toEqual(['users', 'inventory']);
  });

  it('reads beyond the database page limit when calculating teacher totals', async () => {
    state.rows.inventory = Array.from({ length: 1001 }, (_, id) => ({ id, user_id: 'teacher-a', name: '공', quantity: 1 }));
    const response = await teachers();
    expect(response.status).toBe(200);
    expect((await response.json()).items[0]).toMatchObject({ inventory_item_count: 1001, inventory_total_held: 1001 });
    expect(state.tables).toEqual(['users', 'inventory', 'inventory']);
  });

  it('returns only the selected teacher holdings with original inventory IDs, not rental IDs', async () => {
    const response = await rentals(request('rentals?teacher_id=teacher-a&active=true'));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ items: [], data_source: 'legacy', inventory_items: state.rows.inventory.slice(0, 2) });
    expect(state.tables).toEqual(['inventory']);
  });

  it('preserves original history content, owner filtering, ordering and pagination', async () => {
    const response = await history(request('history?teacher_id=teacher-a&limit=1&offset=1'));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ items: [], data_source: 'legacy', history_items: [state.rows.inventory_logs[0]] });
    expect(state.tables).toEqual(['inventory_logs']);
  });

  it.each([['history', history], ['rentals', rentals]] as const)('rejects invented catalog mappings for legacy %s', async (path, route) => {
    expect((await route(request(`${path}?catalog_id=11`))).status).toBe(400);
    expect(state.tables).toEqual([]);
  });

  it.each([
    ['stock', 'catalog', () => stock()],
    ['teachers', 'inventory', () => teachers()],
    ['rentals', 'inventory', () => rentals(request('rentals?teacher_id=teacher-a'))],
    ['history', 'inventory_logs', () => history(request('history'))],
  ] as const)('reports a genuine %s read failure instead of silently returning empty success', async (_path, table, route) => {
    state.failTable = table;
    const response = await route();
    expect(response.status).toBe(500);
    expect((await response.json()).error).not.toContain('missing relation');
  });

  it('keeps the opted-in ledger stock implementation unchanged', async () => {
    state.ledger = true;
    const reader = vi.spyOn(stockReader, 'fetchEquipmentStock').mockResolvedValueOnce([]);
    const response = await stock();
    expect(response.status).toBe(200);
    expect((await response.json()).capabilities.ledger_writes).toBe(true);
    expect(reader).toHaveBeenCalledOnce();
    expect(state.tables).toEqual([]);
  });

  it.each([
    ['stock', () => stock()], ['teachers', () => teachers()],
    ['rentals', () => rentals(request('rentals'))], ['history', () => history(request('history'))],
  ] as const)('retains the admin guard before any %s data access', async (_path, route) => {
    state.allowed = false;
    expect((await route()).status).toBe(403);
    expect(state.service).not.toHaveBeenCalled();
    expect(state.tables).toEqual([]);
  });
});
