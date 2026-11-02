import type { SupabaseClient } from '@supabase/supabase-js';
import type { EquipmentStockRow } from '@/app/lib/equipment/types';

/** Existing records retain their own IDs; names are not a catalog/stock mapping. */
export type LegacyEquipmentCatalogItem = {
  catalog_id: number;
  name: string;
  category: string | null;
  image: string | null;
  simple_desc: string | null;
  key_points: string | null;
  usage_examples: string | null;
};

export type LegacyEquipmentInventoryItem = {
  id: number;
  user_id: string;
  name: string;
  quantity: number;
};

export type LegacyEquipmentHistoryItem = {
  id: number;
  user_id: string;
  content: string | null;
  type: string | null;
  created_at: string;
};

export async function fetchLegacyCatalog(service: SupabaseClient): Promise<LegacyEquipmentCatalogItem[]> {
  const { data, error } = await service.from('catalog')
    .select('id, name, category, image, simple_desc, key_points, usage_examples')
    .order('name');
  if (error) throw error;
  return (data ?? []).map(({ id, ...row }) => ({ ...row, catalog_id: id }));
}

/** Read-only catalog rows for ledger UI before DB expand (images/meta; no T/W/L as zero). */
export function legacyCatalogToStockPreviewRows(catalog: LegacyEquipmentCatalogItem[]): EquipmentStockRow[] {
  return catalog.map((c) => ({
    catalog_id: c.catalog_id,
    name: c.name,
    category: c.category,
    mgmt_code: null,
    image: c.image,
    simple_desc: c.simple_desc,
    key_points: c.key_points,
    usage_examples: c.usage_examples,
    qty_on_hand_total: 0,
    qty_quarantine: 0,
    qty_lent: 0,
    qty_warehouse: 0,
    qty_available: 0,
    opening_confirmed: false,
    cache_drift: false,
    stock_metrics_available: false,
  }));
}

export async function fetchLegacyInventory(service: SupabaseClient, teacherId?: string): Promise<LegacyEquipmentInventoryItem[]> {
  const items: LegacyEquipmentInventoryItem[] = [];
  // The teacher summary must not silently stop at PostgREST's 1,000-row limit.
  for (let offset = 0; ; offset += 1000) {
    let query = service.from('inventory').select('id, user_id, name, quantity').order('id')
      .range(offset, offset + 999);
    if (teacherId) query = query.eq('user_id', teacherId);
    const { data, error } = await query;
    if (error) throw error;
    items.push(...(data ?? []));
    if (!data || data.length < 1000) return items;
  }
}
