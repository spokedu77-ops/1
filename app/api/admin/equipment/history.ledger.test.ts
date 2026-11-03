import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET as history } from './history/route';

const state = vi.hoisted(() => ({
  ledger: true,
  schemaReady: true,
  eventTypes: [] as string[],
  rows: [] as Record<string, unknown>[],
}));

vi.mock('@/app/lib/equipment/writeMode', () => ({
  isLedgerWriteMode: () => state.ledger,
}));
vi.mock('@/app/lib/equipment/schemaReady', () => ({
  isEquipmentLedgerSchemaReady: async () => state.schemaReady,
}));
vi.mock('@/app/lib/server/adminAuth', () => ({
  requireAdmin: async () => ({ ok: true }),
  getServiceSupabase: () => ({
    from(table: string) {
      expect(table).toBe('equipment_ledger');
      const query: Record<string, unknown> = {};
      query.select = () => query;
      query.in = (_key: string, values: string[]) => {
        state.eventTypes = values;
        return query;
      };
      query.order = () => query;
      query.range = () => query;
      query.eq = () => query;
      query.then = (resolve: (v: unknown) => unknown) =>
        Promise.resolve({ data: state.rows, error: null }).then(resolve);
      return query;
    },
  }),
}));

describe('ledger equipment history', () => {
  beforeEach(() => {
    state.ledger = true;
    state.schemaReady = true;
    state.eventTypes = [];
    state.rows = [
      {
        ledger_id: 'l1',
        event_type: 'RETURN_CONFIRM',
        catalog_id: 1,
        teacher_id: 't1',
        rental_id: 'r1',
        qty: 2,
        note: '반납',
        occurred_at: '2026-11-01T00:00:00Z',
        metadata: {},
        created_by: null,
        catalog: { name: '교구A' },
        teacher: { name: '강사A' },
      },
      {
        ledger_id: 'l2',
        event_type: 'RENT',
        catalog_id: 1,
        teacher_id: 't1',
        rental_id: 'r2',
        qty: 1,
        note: '기존 보유 스냅샷 이관',
        occurred_at: '2026-10-01T00:00:00Z',
        metadata: { source: 'LEGACY_INVENTORY_SNAPSHOT' },
        created_by: null,
        catalog: { name: '교구A' },
        teacher: { name: '강사A' },
      },
    ];
  });

  it('queries RETURN_CONFIRM (not RETURN) and hides legacy migration rents', async () => {
    const res = await history(new Request('http://localhost/api/admin/equipment/history'));
    expect(res.status).toBe(200);
    expect(state.eventTypes).toEqual(['RENT', 'RETURN_CONFIRM']);
    const body = await res.json();
    expect(body.items).toHaveLength(1);
    expect(body.items[0].event_type).toBe('RETURN_CONFIRM');
  });
});
