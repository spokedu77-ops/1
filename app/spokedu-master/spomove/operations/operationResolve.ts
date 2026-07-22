/**
 * Operation resolve (O1) — no Session UI wiring yet.
 */
import { validateOperationConfig, type ValidateOperationArgs } from './operationConstraints';
import { mergeOperationConfig } from './operationMerge';
import { getOperationProfile } from './operationProfiles';
import type {
  ActivityOperationConfig,
  ActivityOperationPatch,
  ActivityOperationProfileId,
  IncomingSessionOverride,
  OperationEngineCapabilities,
  OperationResolutionStatus,
  OperationValidationResult,
  PresetConfigPreferenceV1,
} from './operationTypes';

export type ResolveOperationArgs = {
  familyOperationProfileId: ActivityOperationProfileId;
  presetOperationProfileId?: ActivityOperationProfileId;
  recommendedOperation?: ActivityOperationPatch;
  preference?: PresetConfigPreferenceV1 | null;
  incoming?: IncomingSessionOverride | null;
  capabilities?: OperationEngineCapabilities;
  activityFamilyId?: string;
};

export type ResolvedOperationLayer = {
  profileId: ActivityOperationProfileId;
  declared: ActivityOperationConfig;
  /** Preference+incoming merge, before capability sanitize — Preference 저장용 */
  candidate: ActivityOperationConfig;
  validation: OperationValidationResult;
  effective: ActivityOperationConfig;
  status: OperationResolutionStatus;
};

export function resolveOperationProfileId(
  familyId: ActivityOperationProfileId,
  presetOverride?: ActivityOperationProfileId,
): ActivityOperationProfileId {
  return presetOverride ?? familyId;
}

export function buildDeclaredOperation(
  profileId: ActivityOperationProfileId,
  recommendedOperation?: ActivityOperationPatch,
): ActivityOperationConfig {
  const profile = getOperationProfile(profileId);
  return mergeOperationConfig(profile.defaultConfig, recommendedOperation);
}

/**
 * Preference patch + incoming override → candidate, then sanitize with capabilities.
 * Never persist sanitized effective back into preference (caller responsibility).
 */
export function resolveOperationLayer(args: ResolveOperationArgs): ResolvedOperationLayer {
  const profileId = resolveOperationProfileId(args.familyOperationProfileId, args.presetOperationProfileId);
  const profile = getOperationProfile(profileId);
  const declared = buildDeclaredOperation(profileId, args.recommendedOperation);

  if (profile.exposure === 'legacyDisabled') {
    return {
      profileId,
      declared,
      candidate: declared,
      validation: {
        config: { ...profile.defaultConfig, equipment: { ...profile.defaultConfig.equipment }, timing: { ...profile.defaultConfig.timing } },
        status: 'fallback',
        issues: [{ code: 'legacyDisabled', message: 'operation layer disabled' }],
      },
      effective: profile.defaultConfig,
      status: 'legacyDisabled',
    };
  }

  let candidate = declared;
  if (args.preference?.operationPatch) {
    candidate = mergeOperationConfig(candidate, args.preference.operationPatch);
  }
  if (args.incoming?.operation) {
    candidate = mergeOperationConfig(candidate, args.incoming.operation);
  }

  const validationArgs: ValidateOperationArgs = {
    profile,
    config: candidate,
    official: declared,
    capabilities: args.capabilities ?? { interval: false, shuttle: false },
    activityFamilyId: args.activityFamilyId,
  };
  const validation = validateOperationConfig(validationArgs);

  let status: OperationResolutionStatus = 'ready';
  if (validation.status === 'sanitized') status = 'sanitized';
  if (validation.status === 'fallback') status = 'fallback';

  return {
    profileId,
    declared,
    candidate,
    validation,
    effective: validation.config,
    status,
  };
}

/** O3 baseline — interval off until engine wiring exists. */
export function defaultOperationEngineCapabilities(): OperationEngineCapabilities {
  return { interval: false, shuttle: false };
}

/**
 * O4 — EngineRouter가 MemoryGameApp intervalLaunch를 실제로 넘기는 mode만 true.
 * spatial/reactTrain/flow 등은 미배선 → false.
 */
export function resolveOperationEngineCapabilities(engineMode: string): OperationEngineCapabilities {
  switch (engineMode) {
    case 'basic':
    case 'simon':
    case 'flanker':
    case 'stroop':
      return { interval: true, shuttle: false };
    default:
      return { interval: false, shuttle: false };
  }
}
