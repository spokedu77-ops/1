'use client';

import { EquipmentInventoryApp } from './EquipmentInventoryApp';
import { LegacyInventoryClient } from './LegacyInventoryClient';

/** New 3-tab UI only when explicitly enabled; default preserves legacy admin inventory. */
function useLegacyInventoryUi() {
  return process.env.NEXT_PUBLIC_EQUIPMENT_UI !== 'ledger';
}

export default function AdminInventoryPage() {
  if (useLegacyInventoryUi()) {
    return <LegacyInventoryClient />;
  }
  return <EquipmentInventoryApp />;
}
