export type BaseMovementId =
  | 'footTap'
  | 'handTouch'
  | 'stepHold'
  | 'squatTouch'
  | 'lungeReach'
  | 'twoLegJump'
  | 'singleLegHop'
  | 'boundingStep'
  | 'plankTouch'
  | 'quickStep';

export type LimbRule = 'free' | 'sameSide' | 'oppositeSide';

/** @deprecated Operation.startZone으로 이전. O1+ Resolver는 Operation을 우선. */
export type MovementStartPosition = 'behindMat' | 'onMat';

/** @deprecated 수업 복귀는 Operation.timing. 동작 완료는 MovementCompletionBehavior. */
export type MovementReturnRule = 'returnOutside' | 'holdOnTarget' | 'stayAndTransition';

/** 동작 완료 기준 (복귀·왕복 아님) */
export type MovementCompletionBehavior = 'briefContact' | 'holdOnTarget' | 'completePose';

export type MovementBodyFocus = 'feet' | 'hands' | 'wholeBody' | 'balance';

export type MovementImpactLevel = 'low' | 'medium' | 'high';

export type MovementSelectionMode = 'selectable' | 'fixed' | 'disabled';

export type MovementProfileId =
  | 'simpleColorResponse'
  | 'themedFullResponse'
  | 'visualSearch'
  | 'choiceReaction'
  | 'complexReaction'
  | 'sequentialMemory'
  | 'gameSpecific'
  | 'diveBuiltIn'
  | 'variantFootFixed'
  | 'bodyCueBuiltIn';

export type MovementDefinition = {
  id: BaseMovementId;
  label: string;
  shortLabel: string;
  bodyFocus: MovementBodyFocus;
  impactLevel: MovementImpactLevel;
  jumpFree: boolean;
  minimumCueSeconds: number;
  recommendedCueSeconds?: number;
  /** @deprecated Operation.startZone */
  defaultStartPosition: MovementStartPosition;
  /** @deprecated Operation / completionBehavior */
  defaultReturnRule: MovementReturnRule;
  /** 동작 완료 기준 (복귀 아님) */
  completionBehavior: MovementCompletionBehavior;
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

export type MovementPick = {
  baseMovement: BaseMovementId;
  limbRule: LimbRule;
};

export type ActivityFamilyDefinition = {
  id: ActivityFamilyId;
  movementProfileId: MovementProfileId;
  /** Operation Layer — 필수. 미검수는 legacyFixed (legacyDisabled Sentinel). */
  operationProfileId: import('../operations/operationTypes').ActivityOperationProfileId;
  matRequirement: { minMats: number; maxMats?: number };
  /** 공식 추천 — Profile.recommended보다 우선. 표시·첫 사용자 기본 */
  recommendedMovement?: MovementPick;
  /** 교육 검수로 제외한 조합 — URL·저장도 우회 불가 */
  excludedMovements?: MovementPick[];
};

export type MovementResolutionStatus = 'pending' | 'ready' | 'disabled' | 'legacyFallback';

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
