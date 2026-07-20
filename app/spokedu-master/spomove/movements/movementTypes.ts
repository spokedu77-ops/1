export type BaseMovementId =
  | 'footTap'
  | 'handTouch'
  | 'stepHold'
  | 'squatTouch'
  | 'lungeReach';

export type LimbRule = 'free' | 'sameSide' | 'oppositeSide';

export type MovementStartPosition = 'behindMat' | 'onMat';

export type MovementReturnRule = 'returnOutside' | 'holdOnTarget' | 'stayAndTransition';

export type MovementBodyFocus = 'feet' | 'hands' | 'wholeBody' | 'balance';

export type MovementImpactLevel = 'low' | 'medium' | 'high';

export type MovementSelectionMode = 'selectable' | 'fixed' | 'disabled';

export type MovementProfileId =
  | 'simpleColorResponse'
  | 'visualSearch'
  | 'choiceReaction'
  | 'complexReaction'
  | 'sequentialMemory'
  | 'gameSpecific'
  | 'diveBuiltIn';

export type MovementDefinition = {
  id: BaseMovementId;
  label: string;
  shortLabel: string;
  bodyFocus: MovementBodyFocus;
  impactLevel: MovementImpactLevel;
  jumpFree: boolean;
  minimumCueSeconds: number;
  recommendedCueSeconds?: number;
  defaultStartPosition: MovementStartPosition;
  defaultReturnRule: MovementReturnRule;
  supportedLimbRules: LimbRule[];
  instruction: string;
  teacherCue: string;
  easyVariation?: string;
  hardVariation?: string;
  safetyNote?: string;
};

export type MovementAlternative = {
  baseMovement: BaseMovementId;
  allowedLimbRules: LimbRule[];
  startPosition?: MovementStartPosition;
  returnRule?: MovementReturnRule;
};

export type MovementProfile = {
  id: MovementProfileId;
  selectionMode: MovementSelectionMode;
  recommended: { baseMovement: BaseMovementId; limbRule: LimbRule };
  alternatives: MovementAlternative[];
  minimumMovementCount: number;
};

export type ActivityFamilyId = string;

export type ActivityFamilyDefinition = {
  id: ActivityFamilyId;
  movementProfileId: MovementProfileId;
  matRequirement: { minMats: number; maxMats?: number };
};

export type MovementPick = {
  baseMovement: BaseMovementId;
  limbRule: LimbRule;
};

export type ResolvedMovementConfiguration = {
  baseMovement: BaseMovementId;
  limbRule: LimbRule;
  startPosition: MovementStartPosition;
  returnRule: MovementReturnRule;
  displayLabel: string;
  instruction: string;
  hudLabel: string;
  teacherCue: string;
};

export type SpomatColor = 'red' | 'yellow' | 'green' | 'blue';

export type MovementUsageEventType =
  | 'session_started'
  | 'session_completed'
  | 'session_exited'
  | 'movement_changed'
  | 'hud_collapsed'
  | 'hud_expanded';

export type MovementUsageEvent = {
  schemaVersion: 1;
  eventType: MovementUsageEventType;
  sessionId: string;
  occurredAt: string;
  presetId: string;
  activityFamilyId: string;
  baseMovement: BaseMovementId;
  limbRule: LimbRule;
  source: 'recommended' | 'saved' | 'url' | 'changed';
  cueSeconds: number;
};

export type MovementQuickFilter = 'singleMat' | 'feet' | 'hands' | 'lowImpact' | 'balance' | 'specialSupport';
