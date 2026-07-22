/**
 * SPOMOVE Operation Layer types (O1).
 * SSOT: docs/SPOMOVE_OPERATION_LAYER_SSOT.md
 */
import type { MovementPick } from '../movements/movementTypes';

export type StartZone = 'onMat' | 'adjacentToMat' | 'externalSpot';

export type ParticipantScale = 'individual' | 'pair' | 'smallGroup' | 'team';

export type EquipmentMode = 'none' | 'hold' | 'balance' | 'connect' | 'manipulate';

export type EquipmentId = 'beanbag' | 'band' | 'funstick' | 'ball' | 'racket';

export type ParticipationFormat =
  | 'independent'
  | 'synchronized'
  | 'alternating'
  | 'cooperative'
  | 'competitive';

export type ActivityTimingPattern =
  | 'continuous'
  | 'responseWindow'
  | 'interval'
  | 'shuttle'
  | 'sequence'
  | 'builtIn';

export type ActivityTimingConfig =
  | { pattern: 'continuous' }
  | { pattern: 'responseWindow' }
  | { pattern: 'interval'; workSeconds: number; restSeconds: number; sets: number }
  | { pattern: 'shuttle'; responseSeconds: number; returnSeconds: number; readySeconds: number }
  | { pattern: 'sequence' }
  | { pattern: 'builtIn' };

export type ActivityOperationConfig = {
  startZone: StartZone;
  participantScale: ParticipantScale;
  equipment: {
    mode: EquipmentMode;
    equipmentId?: EquipmentId;
  };
  timing: ActivityTimingConfig;
  participationFormat: ParticipationFormat;
};

/** Nested-safe patch. timing must be a complete union object when present. */
export type ActivityOperationPatch = {
  startZone?: StartZone;
  participantScale?: ParticipantScale;
  equipment?: {
    mode?: EquipmentMode;
    equipmentId?: EquipmentId;
  };
  timing?: ActivityTimingConfig;
  participationFormat?: ParticipationFormat;
};

export type ActivityOperationProfileId =
  | 'immediateResponse'
  | 'choiceControl'
  | 'builtIn'
  | 'legacyFixed';

export type OperationProfileExposure = 'configurable' | 'fixed' | 'legacyDisabled';

export type OperationAllowlist = {
  startZones: StartZone[];
  participantScales: ParticipantScale[];
  equipmentModes: EquipmentMode[];
  timingPatterns: ActivityTimingPattern[];
  participationFormats: ParticipationFormat[];
};

export type OperationConstraintId =
  | 'noCoopSolo'
  | 'connectNeedsPair'
  | 'externalNotContinuous'
  | 'shuttleNeedsEngine'
  | 'sequenceFamilyOnly'
  | 'builtInFamilyOnly';

export type OperationProfile = {
  id: ActivityOperationProfileId;
  exposure: OperationProfileExposure;
  defaultConfig: ActivityOperationConfig;
  allowed: OperationAllowlist;
  constraints: OperationConstraintId[];
};

export type OperationResolutionStatus = 'ready' | 'legacyDisabled' | 'sanitized' | 'fallback';

export type OperationValidationIssue = {
  code: string;
  message: string;
  axis?: keyof ActivityOperationConfig | 'timing' | 'equipment';
};

export type OperationValidationResult = {
  config: ActivityOperationConfig;
  status: 'valid' | 'sanitized' | 'fallback';
  issues: OperationValidationIssue[];
};

export type OperationEngineCapabilities = {
  interval: boolean;
  shuttle: boolean;
};

export type ResolvedMatGuidance = {
  minimum: number;
  recommended: number;
  basis: 'familyMinimum' | 'onePerParticipant' | 'scaleDefault' | 'classSetOverride';
  issue?: 'participantCountUnknown' | 'teamOverrideMissing';
};

export type PresetConfigPreferenceV1 = {
  schemaVersion: 1;
  presetId: string;
  movement?: MovementPick;
  operationPatch?: ActivityOperationPatch;
  cueSeconds?: number;
  difficultyValue?: string;
};

export type SpomoveSessionSnapshotV2 =
  | {
      schemaVersion: 2;
      presetId: string;
      movement: MovementPick | null;
      operationLayerStatus: 'legacyDisabled';
      operation?: never;
      cueSeconds: number;
      difficultyKind?: string;
      difficultyValue?: string;
    }
  | {
      schemaVersion: 2;
      presetId: string;
      movement: MovementPick | null;
      operationLayerStatus: 'ready' | 'sanitized' | 'fallback';
      operation: ActivityOperationConfig;
      cueSeconds: number;
      difficultyKind?: string;
      difficultyValue?: string;
    };

export type IncomingSessionOverride = {
  source: 'url' | 'recent' | 'classSet';
  movement?: MovementPick;
  operation?: ActivityOperationPatch;
  cueSeconds?: number;
  difficulty?: string;
};

export type OfficialClassSetItem = {
  presetId: string;
  titleOverride?: string;
  movement?: MovementPick;
  operation?: ActivityOperationPatch;
  cueSeconds?: number;
  matsOverride?: number;
};

/** Legacy Movement start → Operation startZone */
export type LegacyMovementStartPosition = 'behindMat' | 'onMat';

export function migrateLegacyStartPosition(value: LegacyMovementStartPosition): StartZone {
  return value === 'behindMat' ? 'adjacentToMat' : 'onMat';
}
