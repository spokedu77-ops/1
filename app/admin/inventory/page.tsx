'use client';

import { EquipmentInventoryApp } from './EquipmentInventoryApp';
import { LegacyInventoryClient } from './LegacyInventoryClient';

function useLegacyInventoryUi() {
  return process.env.NEXT_PUBLIC_EQUIPMENT_UI === 'legacy';
}

export default function AdminInventoryPage() {
  if (useLegacyInventoryUi()) {
    return <LegacyInventoryClient />;
  }
  return <EquipmentInventoryApp />;
}
