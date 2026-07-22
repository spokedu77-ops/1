/**
 * Operation profiles (O1): 3 commercial + legacyFixed sentinel.
 */
import type { ActivityOperationConfig, OperationProfile } from './operationTypes';

const INDEPENDENT_ON_MAT: ActivityOperationConfig = {
  startZone: 'onMat',
  participantScale: 'individual',
  equipment: { mode: 'none' },
  timing: { pattern: 'continuous' },
  participationFormat: 'independent',
};

const RESPONSE_WINDOW_ON_MAT: ActivityOperationConfig = {
  startZone: 'onMat',
  participantScale: 'individual',
  equipment: { mode: 'none' },
  timing: { pattern: 'responseWindow' },
  participationFormat: 'independent',
};

const BUILT_IN_FIXED: ActivityOperationConfig = {
  startZone: 'onMat',
  participantScale: 'individual',
  equipment: { mode: 'none' },
  timing: { pattern: 'builtIn' },
  participationFormat: 'independent',
};

export const OPERATION_PROFILES: Record<OperationProfile['id'], OperationProfile> = {
  immediateResponse: {
    id: 'immediateResponse',
    exposure: 'configurable',
    defaultConfig: INDEPENDENT_ON_MAT,
    allowed: {
      startZones: ['onMat', 'adjacentToMat'],
      participantScales: ['individual', 'pair', 'smallGroup'],
      equipmentModes: ['none', 'balance', 'connect'],
      timingPatterns: ['continuous', 'responseWindow', 'interval'],
      participationFormats: ['independent', 'synchronized', 'cooperative', 'competitive'],
    },
    constraints: ['noCoopSolo', 'connectNeedsPair', 'externalNotContinuous', 'shuttleNeedsEngine'],
  },
  choiceControl: {
    id: 'choiceControl',
    exposure: 'configurable',
    defaultConfig: RESPONSE_WINDOW_ON_MAT,
    allowed: {
      startZones: ['onMat', 'adjacentToMat'],
      participantScales: ['individual', 'pair'],
      equipmentModes: ['none', 'hold'],
      timingPatterns: ['responseWindow', 'interval'],
      participationFormats: ['independent', 'synchronized', 'competitive'],
    },
    constraints: ['noCoopSolo', 'connectNeedsPair', 'externalNotContinuous', 'shuttleNeedsEngine'],
  },
  builtIn: {
    id: 'builtIn',
    exposure: 'fixed',
    defaultConfig: BUILT_IN_FIXED,
    allowed: {
      startZones: ['onMat', 'adjacentToMat'],
      participantScales: ['individual', 'pair'],
      equipmentModes: ['none'],
      timingPatterns: ['builtIn', 'interval'],
      participationFormats: ['independent', 'synchronized', 'competitive'],
    },
    constraints: ['noCoopSolo', 'builtInFamilyOnly', 'shuttleNeedsEngine'],
  },
  legacyFixed: {
    id: 'legacyFixed',
    exposure: 'legacyDisabled',
    defaultConfig: INDEPENDENT_ON_MAT,
    allowed: {
      startZones: ['onMat'],
      participantScales: ['individual'],
      equipmentModes: ['none'],
      timingPatterns: ['continuous'],
      participationFormats: ['independent'],
    },
    constraints: [],
  },
};

export function getOperationProfile(id: OperationProfile['id']): OperationProfile {
  return OPERATION_PROFILES[id];
}
