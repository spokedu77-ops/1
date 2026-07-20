import { getActivityFamily } from './activityFamilies';
import { effectiveMinimumCueSeconds, movementDisplayLabel, movementHudLabel } from './movementLabels';
import { getMovementProfile } from './movementProfiles';
import { MOVEMENT_REGISTRY } from './movementRegistry';
import type {
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

export function listAllowedMovementPicks(profile: MovementProfile): MovementPick[] {
  const picks: MovementPick[] = [];
  for (const alt of profile.alternatives) {
    const def = MOVEMENT_REGISTRY[alt.baseMovement];
    for (const limb of alt.allowedLimbRules) {
      if (!def.supportedLimbRules.includes(limb)) continue;
      picks.push({ baseMovement: alt.baseMovement, limbRule: limb });
    }
  }
  return picks;
}

export function isAllowedMovement(pick: MovementPick | null | undefined, profile: MovementProfile): boolean {
  if (!pick) return false;
  return listAllowedMovementPicks(profile).some(
    (allowed) => allowed.baseMovement === pick.baseMovement && allowed.limbRule === pick.limbRule,
  );
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

export type ResolveMovementInput = {
  profile: MovementProfile;
  urlMovement?: MovementPick | null;
  savedMovement?: MovementPick | null;
};

/** disabled → null. URL > family 저장 > recommended > DEFAULT (selectable/fixed만) */
export function resolveMovementPick(input: ResolveMovementInput): MovementPick | null {
  const { profile } = input;
  if (profile.selectionMode === 'disabled') return null;

  if (isAllowedMovement(input.urlMovement, profile)) return input.urlMovement!;
  if (isAllowedMovement(input.savedMovement, profile)) return input.savedMovement!;
  if (isAllowedMovement(profile.recommended, profile)) return profile.recommended;
  if (profile.selectionMode === 'fixed' && isAllowedMovement(profile.recommended, profile)) {
    return profile.recommended;
  }
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
  return getMovementProfile(family.movementProfileId);
}
