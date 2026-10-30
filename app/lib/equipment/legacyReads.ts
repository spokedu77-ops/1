import type { SupabaseClient } from '@supabase/supabase-js';

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
