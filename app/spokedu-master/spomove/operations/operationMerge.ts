/**
 * Merge ActivityOperationConfig with nested-safe patches.
 */
import type { ActivityOperationConfig, ActivityOperationPatch } from './operationTypes';

export function mergeOperationConfig(
  base: ActivityOperationConfig,
  patch?: ActivityOperationPatch,
): ActivityOperationConfig {
  if (!patch) return { ...base, equipment: { ...base.equipment }, timing: { ...base.timing } };

  const equipment = {
    ...base.equipment,
    ...(patch.equipment ?? {}),
  };
  if (equipment.mode === 'none') {
    delete equipment.equipmentId;
  }

  const timing = patch.timing ? { ...patch.timing } : { ...base.timing };

  return {
    startZone: patch.startZone ?? base.startZone,
    participantScale: patch.participantScale ?? base.participantScale,
    equipment,
    timing,
    participationFormat: patch.participationFormat ?? base.participationFormat,
  };
}
