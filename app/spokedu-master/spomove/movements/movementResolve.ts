import { getActivityFamily } from './activityFamilies';
import { effectiveMinimumCueSeconds, movementDisplayLabel, movementHudLabel } from './movementLabels';
import { getMovementProfile, MOVEMENT_PROFILES } from './movementProfiles';
import { MOVEMENT_REGISTRY } from './movementRegistry';
import type {
  ActivityFamilyDefinition,
  BaseMovementId,
  LimbRule,
  MovementPick,
  MovementProfile,
  ResolvedMovementConfiguration,
} from './movementTypes';

export const DEFAULT_SAFE_MOVEMENT: MovementPick = {
  baseMovement: 'footTap',
  limbRule: 'free',
};

export function movementPicksEqual(a: MovementPick, b: MovementPick) {
  return a.baseMovement === b.baseMovement && a.limbRule === b.limbRule;
}

/** @deprecated movementPicksEqual 사용 */
function picksEqual(a: MovementPick, b: MovementPick) {
  return movementPicksEqual(a, b);
}

export function listAllowedMovementPicks(
  profile: MovementProfile,
  family?: ActivityFamilyDefinition | null,
): MovementPick[] {
  const picks: MovementPick[] = [];
  for (const alt of profile.alternatives) {
    const def = MOVEMENT_REGISTRY[alt.baseMovement];
    for (const limb of alt.allowedLimbRules) {
      if (!def.supportedLimbRules.includes(limb)) continue;
      const pick = { baseMovement: alt.baseMovement, limbRule: limb };
      if (family && isExcludedByFamily(pick, family)) continue;
      picks.push(pick);
    }
  }
  return picks;
}

export function isExcludedByFamily(
  pick: MovementPick | null | undefined,
  family: ActivityFamilyDefinition,
): boolean {
  if (!pick || !family.excludedMovements?.length) return false;
  return family.excludedMovements.some((excluded) => picksEqual(excluded, pick));
}

export function isAllowedMovement(pick: MovementPick | null | undefined, profile: MovementProfile): boolean {
  if (!pick) return false;
  return listAllowedMovementPicks(profile).some((allowed) => picksEqual(allowed, pick));
}

/** Profile 허용 + Family 제외 — URL·저장·추천 공통 */
export function isAllowedByFamily(
  pick: MovementPick | null | undefined,
  family: ActivityFamilyDefinition,
  profile: MovementProfile,
): boolean {
  if (!pick) return false;
  return isAllowedMovement(pick, profile) && !isExcludedByFamily(pick, family);
}

export function resolveMovementConfiguration(
  pick: MovementPick,
  profile: MovementProfile,
): ResolvedMovementConfiguration {
  const alt = profile.alternatives.find((item) => item.baseMovement === pick.baseMovement);
  const def = MOVEMENT_REGISTRY[pick.baseMovement];
  return {
    baseMovement: pick.baseMovement,
    limbRule: pick.limbRule,
    startPosition: alt?.startPosition ?? def.defaultStartPosition,
    returnRule: alt?.returnRule ?? def.defaultReturnRule,
    displayLabel: movementDisplayLabel(pick),
    instruction: def.instruction,
    hudLabel: movementHudLabel(pick),
    teacherCue: def.teacherCue,
  };
}

/**
 * 공식 추천만 계산. localStorage 변경 금지.
 * Hub 카드·가이드·감사·첫 사용자 기본 표시용.
 */
export function resolveOfficialRecommended(
  family: ActivityFamilyDefinition,
  profile: MovementProfile,
): MovementPick {
  if (profile.selectionMode === 'disabled') return DEFAULT_SAFE_MOVEMENT;

  if (family.recommendedMovement && isAllowedByFamily(family.recommendedMovement, family, profile)) {
    return family.recommendedMovement;
  }
  if (isAllowedByFamily(profile.recommended, family, profile)) {
    return profile.recommended;
  }
  return DEFAULT_SAFE_MOVEMENT;
}

export type ResolveEffectiveMovementInput = {
  profile: MovementProfile;
  family: ActivityFamilyDefinition;
  urlMovement?: MovementPick | null;
  savedMovement?: MovementPick | null;
};

/**
 * 이번 세션 실제 실행값.
 * disabled → null. 유효 URL → 유효 저장 → Family 추천 → Profile 추천 → DEFAULT
 */
export function resolveEffectiveMovement(input: ResolveEffectiveMovementInput): MovementPick | null {
  const { profile, family } = input;
  if (profile.selectionMode === 'disabled') return null;

  if (isAllowedByFamily(input.urlMovement, family, profile)) return input.urlMovement!;
  if (isAllowedByFamily(input.savedMovement, family, profile)) return input.savedMovement!;
  return resolveOfficialRecommended(family, profile);
}

/** @deprecated resolveEffectiveMovement 사용. Family 없이 Profile만 있을 때 호환 */
export function resolveMovementPick(input: {
  profile: MovementProfile;
  urlMovement?: MovementPick | null;
  savedMovement?: MovementPick | null;
  family?: ActivityFamilyDefinition | null;
}): MovementPick | null {
  const { profile } = input;
  if (profile.selectionMode === 'disabled') return null;
  const family = input.family;
  if (family) {
    return resolveEffectiveMovement({
      profile,
      family,
      urlMovement: input.urlMovement,
      savedMovement: input.savedMovement,
    });
  }
  if (isAllowedMovement(input.urlMovement, profile)) return input.urlMovement!;
  if (isAllowedMovement(input.savedMovement, profile)) return input.savedMovement!;
  if (isAllowedMovement(profile.recommended, profile)) return profile.recommended;
  return DEFAULT_SAFE_MOVEMENT;
}

export function resolveSessionConfiguration(args: {
  movement: ResolvedMovementConfiguration;
  cueSeconds: number;
}) {
  const minCue = effectiveMinimumCueSeconds({
    baseMovement: args.movement.baseMovement,
    limbRule: args.movement.limbRule,
  });
  const next = Math.max(args.cueSeconds, minCue);
  return {
    movement: args.movement,
    cueSeconds: next,
    cueAdjusted: next !== args.cueSeconds,
    minimumCueSeconds: minCue,
  };
}

export function parseMovementQuery(
  movement: string | null | undefined,
  limb: string | null | undefined,
): MovementPick | null {
  if (!movement) return null;
  const baseMovement = movement as BaseMovementId;
  if (!(baseMovement in MOVEMENT_REGISTRY)) return null;
  const limbRule = (limb ?? 'free') as LimbRule;
  if (!MOVEMENT_REGISTRY[baseMovement].supportedLimbRules.includes(limbRule)) return null;
  return { baseMovement, limbRule };
}

export function profileSupportsJumpFree(profile: MovementProfile) {
  return listAllowedMovementPicks(profile).some((pick) => MOVEMENT_REGISTRY[pick.baseMovement].jumpFree);
}

export function profileSupportsBodyFocus(
  profile: MovementProfile,
  focus: 'feet' | 'hands' | 'balance' | 'wholeBody',
) {
  return listAllowedMovementPicks(profile).some(
    (pick) => MOVEMENT_REGISTRY[pick.baseMovement].bodyFocus === focus,
  );
}

export function profileSupportsLowImpact(profile: MovementProfile) {
  return listAllowedMovementPicks(profile).some(
    (pick) => MOVEMENT_REGISTRY[pick.baseMovement].impactLevel === 'low',
  );
}

export function familySupportsSingleMat(activityFamilyId: string) {
  const family = getActivityFamily(activityFamilyId);
  return (family?.matRequirement.minMats ?? 99) === 1;
}

export function getProfileForFamilyId(activityFamilyId: string): MovementProfile | null {
  const family = getActivityFamily(activityFamilyId);
  if (!family) return null;
  if (!(family.movementProfileId in MOVEMENT_PROFILES)) return null;
  return getMovementProfile(family.movementProfileId);
}
