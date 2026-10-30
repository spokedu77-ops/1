export type EquipmentWriteMode = 'ledger' | 'legacy';

export function getEquipmentWriteMode(): EquipmentWriteMode {
  const raw = process.env.EQUIPMENT_WRITE_MODE?.trim().toLowerCase();
  if (raw === 'legacy') return 'legacy';
  return 'ledger';
}

export function isLedgerWriteMode(): boolean {
  return getEquipmentWriteMode() === 'ledger';
}
