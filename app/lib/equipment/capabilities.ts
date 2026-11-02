import type { SupabaseClient } from '@supabase/supabase-js';
import { isEquipmentOpeningPersistEnabled } from '@/app/lib/equipment/openingPersist';
import { getEquipmentWriteMode, type EquipmentWriteMode } from '@/app/lib/equipment/writeMode';

export type EquipmentCapabilities = {
  server_write_mode: EquipmentWriteMode;
  ledger_writes: boolean;
  /** false when EQUIPMENT_WRITE_MODE=ledger but DB lacks ledger migration. */
  ledger_schema_ready?: boolean;
  /** null when ops gate table is unavailable (pre-migration DB). */
  legacy_direct_writes_blocked: boolean | null;
  /** true only when EQUIPMENT_OPENING_PERSIST_ENABLED=1 (operational opening writes). */
  opening_persist_enabled?: boolean;
};

export async function fetchEquipmentCapabilities(service: SupabaseClient): Promise<EquipmentCapabilities> {
  const server_write_mode = getEquipmentWriteMode();
  const ledger_writes = server_write_mode === 'ledger';

  let legacy_direct_writes_blocked: boolean | null = null;
  try {
    const { data, error } = await service
      .schema('private')
      .from('equipment_ops_state')
      .select('legacy_direct_writes_blocked')
      .eq('id', 1)
      .maybeSingle();
    if (!error && data) {
      legacy_direct_writes_blocked = data.legacy_direct_writes_blocked === true;
    }
  } catch {
    legacy_direct_writes_blocked = null;
  }

  return {
    server_write_mode,
    ledger_writes,
    ledger_schema_ready: undefined,
    legacy_direct_writes_blocked,
    opening_persist_enabled: isEquipmentOpeningPersistEnabled(),
  };
}
