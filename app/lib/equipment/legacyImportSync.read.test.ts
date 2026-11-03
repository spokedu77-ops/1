import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadLegacyImportPlanForRead } from './legacyImportSync';

const persistSpy = vi.hoisted(() => vi.fn());
const stagedRows = vi.hoisted(() => [] as Record<string, unknown>[]);
const inventoryRows = vi.hoisted(() => [
  { id: 1, user_id: 't1', name: '교구', quantity: 2 },
]);

vi.mock('@/app/lib/equipment/legacyReads', async (importOriginal) => {
  const orig = await importOriginal<typeof import('@/app/lib/equipment/legacyReads')>();
  return {
    ...orig,
    fetchLegacyInventory: async () => inventoryRows,
    fetchLegacyCatalog: async () => [{ catalog_id: 10, name: '교구', category: null, image: null, simple_desc: null, key_points: null, usage_examples: null }],
    fetchEquipmentLegacyImportStatus: async () => ({
      staged_rows: stagedRows.length,
      pending_rows: 0,
      imported_rows: 0,
      pending_items: [],
      catalogs: [],
      unmigrated_items: [],
    }),
  };
});

vi.mock('@/app/lib/equipment/privateSupabase', () => ({
  getPrivateSchemaServiceSupabase: () => ({
    from() {
      return {
        select: () => ({
          order: () => Promise.resolve({ data: stagedRows, error: null }),
        }),
        delete: persistSpy,
        insert: persistSpy,
      };
    },
  }),
}));

const service = {
  from(table: string) {
    if (table === 'users') {
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              eq: () => Promise.resolve({ data: [{ id: 't1' }], error: null }),
            }),
          }),
        }),
      };
    }
    if (table === 'teacher_inventory') {
      return { select: () => Promise.resolve({ data: [], error: null }) };
    }
    throw new Error(`unexpected table ${table}`);
  },
} as never;

describe('loadLegacyImportPlanForRead', () => {
  beforeEach(() => {
    persistSpy.mockClear();
    stagedRows.length = 0;
  });

  it('never writes staging on read', async () => {
    await loadLegacyImportPlanForRead(service);
    expect(persistSpy).not.toHaveBeenCalled();
  });

  it('reuses staged snapshot when inventory hashes still match', async () => {
    const { createHash } = await import('node:crypto');
    const hash = createHash('md5')
      .update(JSON.stringify({ id: 1, user_id: 't1', name: '교구', quantity: 2 }))
      .digest('hex');
    stagedRows.push({
      inventory_id: 1,
      catalog_id: 10,
      owner_id: 't1',
      source_name: '교구',
      source_quantity: 2,
      source_hash: hash,
      resolution: 'mapped',
      reason: null,
    });
    const result = await loadLegacyImportPlanForRead(service);
    expect(result.persisted).toBe(false);
    expect(result.staging_skipped_reason).toBe('read_staged_snapshot');
    expect(result.plan.mapped_rows).toBe(1);
    expect(persistSpy).not.toHaveBeenCalled();
  });
});
