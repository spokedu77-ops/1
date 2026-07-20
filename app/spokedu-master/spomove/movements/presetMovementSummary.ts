import { getActivityFamily } from './activityFamilies';
import { getMovementProfile } from './movementProfiles';
import { movementDisplayLabel } from './movementLabels';
import { listAllowedMovementPicks, profileSupportsBodyFocus, profileSupportsJumpFree } from './movementResolve';
import type { OfficialSpomovePreset } from '../officialSpomovePresets';

export function getPresetMovementSummary(preset: OfficialSpomovePreset) {
  if (!preset.movementProfileId || !preset.activityFamilyId) return null;
  const profile = getMovementProfile(preset.movementProfileId);
  if (profile.selectionMode === 'disabled') return null;

  const family = getActivityFamily(preset.activityFamilyId);
  const picks = listAllowedMovementPicks(profile);

  return {
    profile,
    family,
    recommendedLabel: movementDisplayLabel(profile.recommended),
    variationCount: picks.length,
    minMats: family?.matRequirement.minMats ?? 1,
    jumpFree: profileSupportsJumpFree(profile),
    feet: profileSupportsBodyFocus(profile, 'feet'),
    hands: profileSupportsBodyFocus(profile, 'hands'),
    balance: profileSupportsBodyFocus(profile, 'balance'),
    selectionMode: profile.selectionMode,
  };
}
