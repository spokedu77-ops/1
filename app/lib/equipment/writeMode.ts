export type EquipmentWriteMode = 'ledger' | 'legacy';

/** Server-only. Ledger writes require explicit `EQUIPMENT_WRITE_MODE=ledger`. */
export function getEquipmentWriteMode(): EquipmentWriteMode {
  const raw = process.env.EQUIPMENT_WRITE_MODE?.trim().toLowerCase();
  if (raw === 'ledger') return 'ledger';
  return 'legacy';
}

export function isLedgerWriteMode(): boolean {
  return getEquipmentWriteMode() === 'ledger';
}
