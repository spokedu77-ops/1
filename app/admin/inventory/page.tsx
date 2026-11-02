'use client';

import { EquipmentInventoryApp } from './EquipmentInventoryApp';
import { LegacyInventoryClient } from './LegacyInventoryClient';

/** Ledger UI requires an explicit build-time flag. Unset or other values use legacy. */
function useLedgerInventoryUi() {
  return process.env.NEXT_PUBLIC_EQUIPMENT_UI === 'ledger';
}

export default function AdminInventoryPage() {
  if (useLedgerInventoryUi()) {
    return <EquipmentInventoryApp />;
  }
  return <LegacyInventoryClient />;
}
