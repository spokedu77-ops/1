/**
 * Session/Recent helpers for Operation Layer (O3).
 */
import type { MovementPick } from '../movements/movementTypes';
import type {
  ActivityOperationConfig,
  ActivityOperationPatch,
  ActivityTimingPattern,
  OperationEngineCapabilities,
  OperationProfile,
  SpomoveSessionSnapshotV2,
} from './operationTypes';

export function operationConfigToPatch(config: ActivityOperationConfig): ActivityOperationPatch {
  return {
    startZone: config.startZone,
    participantScale: config.participantScale,
    equipment: { ...config.equipment },
    timing: { ...config.timing },
    participationFormat: config.participationFormat,
  };
}

/** Profile allowlist ∩ engine capability — Settings timing chips. */
export function timingPatternsForCapabilities(
  profile: OperationProfile,
  capabilities: OperationEngineCapabilities,
): ActivityTimingPattern[] {
  return profile.allowed.timingPatterns.filter((pattern) => {
    if (pattern === 'interval') return capabilities.interval;
    if (pattern === 'shuttle') return capabilities.shuttle;
    return true;
  });
}

export function buildSpomoveSessionSnapshotV2(args: {
  presetId: string;
  movement: MovementPick | null;
  operationLayerStatus: SpomoveSessionSnapshotV2['operationLayerStatus'];
  /** Candidate (pre-sanitize) — Recent 재현용. legacyDisabled면 omit */
  operation?: ActivityOperationConfig;
  cueSeconds: number;
  difficultyKind?: string;
  difficultyValue?: string;
}): SpomoveSessionSnapshotV2 {
  if (args.operationLayerStatus === 'legacyDisabled') {
    return {
      schemaVersion: 2,
      presetId: args.presetId,
      movement: args.movement,
      operationLayerStatus: 'legacyDisabled',
      cueSeconds: args.cueSeconds,
      difficultyKind: args.difficultyKind,
      difficultyValue: args.difficultyValue,
    };
  }
  if (!args.operation) {
    throw new Error('buildSpomoveSessionSnapshotV2: operation required when not legacyDisabled');
  }
  return {
    schemaVersion: 2,
    presetId: args.presetId,
    movement: args.movement,
    operationLayerStatus: args.operationLayerStatus,
    operation: args.operation,
    cueSeconds: args.cueSeconds,
    difficultyKind: args.difficultyKind,
    difficultyValue: args.difficultyValue,
  };
}
