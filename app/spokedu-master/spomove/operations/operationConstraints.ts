/**
 * Operation constraints + sanitize (O1).
 */
import { mergeOperationConfig } from './operationMerge';
import type {
  ActivityOperationConfig,
  ActivityTimingConfig,
  OperationConstraintId,
  OperationEngineCapabilities,
  OperationProfile,
  OperationValidationIssue,
  OperationValidationResult,
  ParticipantScale,
  ParticipationFormat,
} from './operationTypes';

const COOP_FORMATS: ParticipationFormat[] = ['cooperative', 'synchronized', 'alternating'];

function cloneConfig(config: ActivityOperationConfig): ActivityOperationConfig {
  return mergeOperationConfig(config);
}

function isTimingComplete(timing: ActivityTimingConfig): boolean {
  if (timing.pattern === 'interval') {
    return (
      Number.isFinite(timing.workSeconds) &&
      Number.isFinite(timing.restSeconds) &&
      Number.isFinite(timing.sets) &&
      timing.workSeconds > 0 &&
      timing.restSeconds >= 0 &&
      timing.sets > 0
    );
  }
  if (timing.pattern === 'shuttle') {
    return (
      Number.isFinite(timing.responseSeconds) &&
      Number.isFinite(timing.returnSeconds) &&
      Number.isFinite(timing.readySeconds)
    );
  }
  return true;
}

function normalizeAgainstAllowlist(
  config: ActivityOperationConfig,
  profile: OperationProfile,
  official: ActivityOperationConfig,
  issues: OperationValidationIssue[],
): ActivityOperationConfig {
  let next = cloneConfig(config);
  const { allowed } = profile;

  if (!allowed.startZones.includes(next.startZone)) {
    issues.push({ code: 'startZoneNotAllowed', message: 'startZone not in allowlist', axis: 'startZone' });
    next = { ...next, startZone: official.startZone };
  }
  if (!allowed.participantScales.includes(next.participantScale)) {
    issues.push({
      code: 'participantScaleNotAllowed',
      message: 'participantScale not in allowlist',
      axis: 'participantScale',
    });
    next = { ...next, participantScale: official.participantScale };
  }
  if (!allowed.equipmentModes.includes(next.equipment.mode)) {
    issues.push({ code: 'equipmentModeNotAllowed', message: 'equipment mode not in allowlist', axis: 'equipment' });
    next = { ...next, equipment: { ...official.equipment } };
  }
  if (!allowed.timingPatterns.includes(next.timing.pattern) || !isTimingComplete(next.timing)) {
    issues.push({ code: 'timingNotAllowed', message: 'timing invalid or not allowed', axis: 'timing' });
    next = { ...next, timing: { ...official.timing } };
  }
  if (!allowed.participationFormats.includes(next.participationFormat)) {
    issues.push({
      code: 'participationFormatNotAllowed',
      message: 'participationFormat not in allowlist',
      axis: 'participationFormat',
    });
    next = { ...next, participationFormat: official.participationFormat };
  }
  if (next.equipment.mode === 'none' && next.equipment.equipmentId) {
    next = { ...next, equipment: { mode: 'none' } };
  }
  return next;
}

function applyConstraint(
  id: OperationConstraintId,
  config: ActivityOperationConfig,
  official: ActivityOperationConfig,
  capabilities: OperationEngineCapabilities,
  familyId: string | undefined,
  issues: OperationValidationIssue[],
): ActivityOperationConfig {
  let next = config;

  switch (id) {
    case 'noCoopSolo': {
      if (next.participantScale === 'individual' && COOP_FORMATS.includes(next.participationFormat)) {
        issues.push({
          code: 'noCoopSolo',
          message: 'individual cannot use cooperative formats',
          axis: 'participationFormat',
        });
        next = { ...next, participationFormat: 'independent' };
      }
      break;
    }
    case 'connectNeedsPair': {
      if (next.equipment.mode === 'connect' && next.participantScale === 'individual') {
        issues.push({ code: 'connectNeedsPair', message: 'connect requires pair+', axis: 'equipment' });
        next = { ...next, equipment: { mode: 'none' } };
      }
      break;
    }
    case 'externalNotContinuous': {
      if (next.startZone === 'externalSpot' && next.timing.pattern === 'continuous') {
        issues.push({
          code: 'externalNotContinuous',
          message: 'externalSpot cannot use continuous',
          axis: 'startZone',
        });
        next = { ...next, startZone: official.startZone };
      }
      break;
    }
    case 'shuttleNeedsEngine': {
      if (next.timing.pattern === 'shuttle' && !capabilities.shuttle) {
        issues.push({
          code: 'unsupportedTimingPattern',
          message: 'shuttle not supported by engine',
          axis: 'timing',
        });
        next = { ...next, timing: { ...official.timing } };
      }
      break;
    }
    case 'sequenceFamilyOnly': {
      if (next.timing.pattern === 'sequence' && familyId !== 'sequential-memory') {
        issues.push({
          code: 'sequenceFamilyOnly',
          message: 'sequence only for sequential-memory',
          axis: 'timing',
        });
        next = { ...next, timing: { ...official.timing } };
      }
      break;
    }
    case 'builtInFamilyOnly': {
      const ok = familyId === 'dive' || familyId === 'reaction-variant-body-cue';
      if (next.timing.pattern === 'builtIn' && familyId && !ok) {
        issues.push({
          code: 'builtInFamilyOnly',
          message: 'builtIn timing only for dive/bodyCue families',
          axis: 'timing',
        });
        next = { ...next, timing: { ...official.timing } };
      }
      break;
    }
    default:
      break;
  }

  return next;
}

function applyCapabilitySanitize(
  config: ActivityOperationConfig,
  official: ActivityOperationConfig,
  capabilities: OperationEngineCapabilities,
  issues: OperationValidationIssue[],
): ActivityOperationConfig {
  let next = config;
  if (next.timing.pattern === 'interval' && !capabilities.interval) {
    issues.push({
      code: 'unsupportedTimingPattern',
      message: 'interval not supported by engine yet',
      axis: 'timing',
    });
    const fallbackTiming =
      official.timing.pattern === 'interval' ? ({ pattern: 'continuous' } as const) : { ...official.timing };
    next = { ...next, timing: fallbackTiming };
  }
  if (next.timing.pattern === 'shuttle' && !capabilities.shuttle) {
    issues.push({
      code: 'unsupportedTimingPattern',
      message: 'shuttle not supported by engine',
      axis: 'timing',
    });
    next = { ...next, timing: { ...official.timing } };
  }
  return next;
}

export type ValidateOperationArgs = {
  profile: OperationProfile;
  config: ActivityOperationConfig;
  official: ActivityOperationConfig;
  capabilities?: OperationEngineCapabilities;
  activityFamilyId?: string;
};

/**
 * Axis-level sanitize. Does not throw. Prefer per-axis fix over full official fallback.
 */
export function validateOperationConfig(args: ValidateOperationArgs): OperationValidationResult {
  const capabilities = args.capabilities ?? { interval: false, shuttle: false };
  const issues: OperationValidationIssue[] = [];

  if (args.profile.exposure === 'legacyDisabled') {
    return {
      config: cloneConfig(args.profile.defaultConfig),
      status: 'fallback',
      issues: [{ code: 'legacyDisabled', message: 'operation layer disabled for family' }],
    };
  }

  let next = normalizeAgainstAllowlist(args.config, args.profile, args.official, issues);

  for (const constraintId of args.profile.constraints) {
    next = applyConstraint(
      constraintId,
      next,
      args.official,
      capabilities,
      args.activityFamilyId,
      issues,
    );
  }

  next = applyCapabilitySanitize(next, args.official, capabilities, issues);

  if (issues.length === 0) {
    return { config: next, status: 'valid', issues };
  }

  // If still identical to official after fixes that wiped user intent entirely, mark fallback
  const wiped =
    next.startZone === args.official.startZone &&
    next.participantScale === args.official.participantScale &&
    next.participationFormat === args.official.participationFormat &&
    next.equipment.mode === args.official.equipment.mode &&
    next.timing.pattern === args.official.timing.pattern &&
    issues.length >= 3;

  return {
    config: next,
    status: wiped ? 'fallback' : 'sanitized',
    issues,
  };
}

export function resolveRequiredMatGuidance(args: {
  minMats: number;
  participantScale: ParticipantScale;
  matsOverride?: number;
  participantCount?: number;
}): import('./operationTypes').ResolvedMatGuidance {
  const minimum = Math.max(1, args.minMats);

  if (typeof args.matsOverride === 'number' && args.matsOverride > 0) {
    return {
      minimum,
      recommended: Math.max(minimum, args.matsOverride),
      basis: 'classSetOverride',
    };
  }

  if (typeof args.participantCount === 'number' && args.participantCount > 0) {
    return {
      minimum,
      recommended: Math.max(minimum, args.participantCount),
      basis: 'onePerParticipant',
    };
  }

  switch (args.participantScale) {
    case 'individual':
      return { minimum, recommended: minimum, basis: 'familyMinimum' };
    case 'pair':
      return { minimum, recommended: Math.max(minimum, 2), basis: 'scaleDefault', issue: 'participantCountUnknown' };
    case 'smallGroup':
      return { minimum, recommended: Math.max(minimum, 4), basis: 'scaleDefault', issue: 'participantCountUnknown' };
    case 'team':
      return {
        minimum,
        recommended: Math.max(minimum, 4),
        basis: 'scaleDefault',
        issue: 'teamOverrideMissing',
      };
    default:
      return { minimum, recommended: minimum, basis: 'familyMinimum' };
  }
}
