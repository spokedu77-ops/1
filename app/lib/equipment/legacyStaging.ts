/** When true, auto-built legacy snapshot is written to private.equipment_legacy_import_rows (isolated DB). */
export function isEquipmentLegacyStagingEnabled(): boolean {
  return process.env.EQUIPMENT_LEGACY_STAGING_ENABLED === '1';
}
