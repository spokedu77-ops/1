import { getActivityFamily } from './activityFamilies';
import { getMovementProfile } from './movementProfiles';
import { movementDisplayLabel } from './movementLabels';
import {
  listAllowedMovementPicks,
  resolveOfficialRecommended,
} from './movementResolve';
import { MOVEMENT_REGISTRY } from './movementRegistry';
import type { MovementPick } from './movementTypes';
import type { OfficialSpomovePreset } from '../officialSpomovePresets';

function picksSupportBodyFocus(
  picks: MovementPick[],
  focus: 'feet' | 'hands' | 'balance' | 'wholeBody',
) {
  return picks.some((pick) => MOVEMENT_REGISTRY[pick.baseMovement].bodyFocus === focus);
}

function picksSupportJumpFree(picks: MovementPick[]) {
  return picks.some((pick) => MOVEMENT_REGISTRY[pick.baseMovement].jumpFree);
}

function picksSupportLowImpact(picks: MovementPick[]) {
  return picks.some((pick) => MOVEMENT_REGISTRY[pick.baseMovement].impactLevel === 'low');
}

export function getPresetMovementSummary(preset: OfficialSpomovePreset) {
  if (!preset.movementProfileId || !preset.activityFamilyId) return null;
  const profile = getMovementProfile(preset.movementProfileId);
  if (profile.selectionMode === 'disabled') return null;

  const family = getActivityFamily(preset.activityFamilyId);
  if (!family) return null;

  const officialRecommended = resolveOfficialRecommended(family, profile, {
    presetRecommendedMovement: preset.recommendedMovement,
  });
  /** Family 제외가 반영된 허용 목록 — Hub 필터 SSOT */
  const picks = listAllowedMovementPicks(profile, family);

  return {
    profile,
    family,
    officialRecommended,
    recommendedLabel: movementDisplayLabel(officialRecommended),
    variationCount: picks.length,
    minMats: family.matRequirement.minMats,
    jumpFree: picksSupportJumpFree(picks),
    feet: picksSupportBodyFocus(picks, 'feet'),
    hands: picksSupportBodyFocus(picks, 'hands'),
    balance: picksSupportBodyFocus(picks, 'balance'),
    lowImpact: picksSupportLowImpact(picks),
    selectionMode: profile.selectionMode,
  };
}

/** Hub 카드·가이드의 공식 추천 pick (localStorage 미사용) */
export function getOfficialRecommendedPick(preset: OfficialSpomovePreset): MovementPick | null {
  return getPresetMovementSummary(preset)?.officialRecommended ?? null;
}
