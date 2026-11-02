/** When false, opening UI validates only; POST /api/admin/equipment/opening returns 403. */
export function isEquipmentOpeningPersistEnabled(): boolean {
  return process.env.EQUIPMENT_OPENING_PERSIST_ENABLED === '1';
}
