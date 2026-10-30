import type { SupabaseClient } from '@supabase/supabase-js';
import { deriveStockMetrics } from '@/app/lib/equipment/stockMath';
import type { EquipmentStockRow } from '@/app/lib/equipment/types';

type CatalogRow = {
  id: number;
  name: string;
  category: string | null;
  mgmt_code: string | null;
  image: string | null;
  simple_desc: string | null;
  key_points: string | null;
  usage_examples: string | null;
  qty_on_hand_total: number | null;
  qty_quarantine: number | null;
};

export async function fetchEquipmentStock(service: SupabaseClient): Promise<EquipmentStockRow[]> {
  const { data: catalog, error: catErr } = await service
    .from('catalog')
    .select(
      'id, name, category, mgmt_code, image, simple_desc, key_points, usage_examples, qty_on_hand_total, qty_quarantine',
    )
    .order('name');
  if (catErr) throw catErr;

  const { data: lentRows, error: lentErr } = await service
    .from('equipment_rentals')
    .select('catalog_id, qty_outstanding')
    .eq('status', 'active')
    .gt('qty_outstanding', 0);
  if (lentErr) throw lentErr;

  const { data: openingRows, error: openingErr } = await service
    .from('equipment_ledger')
    .select('catalog_id')
    .eq('event_type', 'OPENING_BALANCE_MIGRATION');
  if (openingErr) throw openingErr;
  const openingSet = new Set((openingRows ?? []).map((r) => Number(r.catalog_id)));

  const lentByCatalog = new Map<number, number>();
  for (const row of lentRows ?? []) {
    const id = Number(row.catalog_id);
    lentByCatalog.set(id, (lentByCatalog.get(id) ?? 0) + Number(row.qty_outstanding));
  }

  const rows = await Promise.all(
    (catalog ?? []).map(async (row: CatalogRow) => {
      const t = row.qty_on_hand_total ?? 0;
      const q = row.qty_quarantine ?? 0;
      const l = lentByCatalog.get(row.id) ?? 0;
      const openingConfirmed = openingSet.has(row.id);
      let cacheDrift = false;
      if (openingConfirmed) {
        const { data: drifted, error: driftErr } = await service.rpc('equipment_catalog_cache_drifted', {
          p_catalog_id: row.id,
        });
        if (driftErr) throw driftErr;
        cacheDrift = drifted === true;
      }
      const metrics = deriveStockMetrics(t, q, l);
      return {
        catalog_id: row.id,
        name: row.name,
        category: row.category,
        mgmt_code: row.mgmt_code,
        image: row.image,
        simple_desc: row.simple_desc,
        key_points: row.key_points,
        usage_examples: row.usage_examples,
        opening_confirmed: openingConfirmed,
        cache_drift: cacheDrift,
        ...metrics,
      };
    }),
  );
  return rows;
}
