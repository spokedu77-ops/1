'use client';

import { EquipmentInventoryApp } from './EquipmentInventoryApp';
import { LegacyInventoryClient } from './LegacyInventoryClient';

/** Use the current 3-tab UI by default; legacy is an explicit rollback option. */
function useLegacyInventoryUi() {
  return process.env.NEXT_PUBLIC_EQUIPMENT_UI === 'legacy';
}

export default function AdminInventoryPage() {
  if (useLegacyInventoryUi()) {
    return <LegacyInventoryClient />;
  }
  return <EquipmentInventoryApp />;
}
