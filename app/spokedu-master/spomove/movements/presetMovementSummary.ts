import { getActivityFamily } from './activityFamilies';
import { getMovementProfile } from './movementProfiles';
import { movementDisplayLabel } from './movementLabels';
import {
  listAllowedMovementPicks,
  profileSupportsBodyFocus,
  profileSupportsJumpFree,
  resolveOfficialRecommended,
} from './movementResolve';
import type { MovementPick } from './movementTypes';
import type { OfficialSpomovePreset } from '../officialSpomovePresets';

export function getPresetMovementSummary(preset: OfficialSpomovePreset) {
  if (!preset.movementProfileId || !preset.activityFamilyId) return null;
  const profile = getMovementProfile(preset.movementProfileId);
  if (profile.selectionMode === 'disabled') return null;

  const family = getActivityFamily(preset.activityFamilyId);
  if (!family) return null;

  const officialRecommended = resolveOfficialRecommended(family, profile);
  const picks = listAllowedMovementPicks(profile, family);

  return {
    profile,
    family,
    officialRecommended,
    recommendedLabel: movementDisplayLabel(officialRecommended),
    variationCount: picks.length,
    minMats: family.matRequirement.minMats,
    jumpFree: profileSupportsJumpFree(profile),
    feet: profileSupportsBodyFocus(profile, 'feet'),
    hands: profileSupportsBodyFocus(profile, 'hands'),
    balance: profileSupportsBodyFocus(profile, 'balance'),
    selectionMode: profile.selectionMode,
  };
}

/** Hub 카드·가이드의 공식 추천 pick (localStorage 미사용) */
export function getOfficialRecommendedPick(preset: OfficialSpomovePreset): MovementPick | null {
  return getPresetMovementSummary(preset)?.officialRecommended ?? null;
}
