import type { SupabaseClient } from '@supabase/supabase-js';

export type PurgeTeacherHoldingsResult = {
  equipment_ledger_rentals: number;
  equipment_rentals: number;
  legacy_import_rows: number;
  inventory: number;
  teacher_inventory: number;
  inventory_logs: number;
};

/** 강사 보유·대여·legacy inventory 전부 제거. 창고 catalog qty·OPENING 원장은 유지. */
export async function purgeTeacherHoldings(service: SupabaseClient): Promise<PurgeTeacherHoldingsResult> {
  const { data, error } = await service.rpc('equipment_ops_purge_teacher_holdings');
  if (error) throw error;
  const row = (data ?? {}) as Record<string, number>;
  return {
    legacy_import_rows: row.legacy_import_rows ?? 0,
    equipment_ledger_rentals: row.equipment_ledger_rentals ?? 0,
    equipment_rentals: row.equipment_rentals ?? 0,
    inventory: row.inventory ?? 0,
    teacher_inventory: row.teacher_inventory ?? 0,
    inventory_logs: row.inventory_logs ?? 0,
  };
}
