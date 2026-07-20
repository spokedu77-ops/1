import type { OfficialSpomovePreset } from '../officialSpomovePresets';
import { deriveFamilyIdForPresetId, getActivityFamily } from './activityFamilies';
import type { MovementProfileId } from './movementTypes';

export type OfficialSpomovePresetWithMovement = OfficialSpomovePreset & {
  activityFamilyId: string;
  movementProfileId: MovementProfileId;
};

export function enrichPresetWithMovementLayer(
  preset: OfficialSpomovePreset,
): OfficialSpomovePresetWithMovement {
  if (preset.activityFamilyId && preset.movementProfileId) {
    return preset as OfficialSpomovePresetWithMovement;
  }

  const familyId = preset.activityFamilyId ?? deriveFamilyIdForPresetId(preset.id);
  if (!familyId) {
    throw new Error(`Missing activityFamilyId for preset: ${preset.id}`);
  }

  const family = getActivityFamily(familyId);
  if (!family) {
    throw new Error(`Unknown activityFamilyId "${familyId}" for preset: ${preset.id}`);
  }

  return {
    ...preset,
    activityFamilyId: familyId,
    movementProfileId: preset.movementProfileId ?? family.movementProfileId,
  };
}

export function enrichOfficialSpomoveLibrary(
  presets: readonly OfficialSpomovePreset[],
): OfficialSpomovePresetWithMovement[] {
  return presets.map(enrichPresetWithMovementLayer);
}
