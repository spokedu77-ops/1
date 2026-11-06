import type { SupabaseClient } from '@supabase/supabase-js';

function isMissingSchemaError(error: { message?: string }): boolean {
  const msg = error.message ?? '';
  return (
    msg.includes('does not exist') ||
    msg.includes('schema cache') ||
    msg.includes('missing relation') ||
    msg.includes('Could not find')
  );
}

/** True when ledger tables/columns required by fetchEquipmentStock exist. */
export async function isEquipmentLedgerSchemaReady(service: SupabaseClient): Promise<boolean> {
  const results = await Promise.all([
    service.from('equipment_rentals').select('rental_id').limit(0),
    service.from('equipment_ledger').select('ledger_id').limit(0),
    service.from('catalog').select('qty_on_hand_total, qty_quarantine, mgmt_code').limit(0),
  ]);
  for (const { error } of results) {
    if (error) {
      if (isMissingSchemaError(error)) return false;
      throw error;
    }
  }
  return true;
}
