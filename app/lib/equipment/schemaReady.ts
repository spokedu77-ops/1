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
  const { error: rentalErr } = await service.from('equipment_rentals').select('rental_id').limit(0);
  if (rentalErr) {
    if (isMissingSchemaError(rentalErr)) return false;
    throw rentalErr;
  }
  const { error: ledgerErr } = await service.from('equipment_ledger').select('ledger_id').limit(0);
  if (ledgerErr) {
    if (isMissingSchemaError(ledgerErr)) return false;
    throw ledgerErr;
  }
  const { error: catErr } = await service
    .from('catalog')
    .select('qty_on_hand_total, qty_quarantine, mgmt_code')
    .limit(0);
  if (catErr) {
    if (isMissingSchemaError(catErr)) return false;
    throw catErr;
  }
  return true;
}
