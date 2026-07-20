import type {
  ActivityFamilyDefinition,
  ActivityFamilyId,
  MovementPick,
  MovementProfileId,
} from './movementTypes';

function pick(baseMovement: MovementPick['baseMovement'], limbRule: MovementPick['limbRule']): MovementPick {
  return { baseMovement, limbRule };
}

function family(
  id: ActivityFamilyId,
  movementProfileId: MovementProfileId,
  options?: {
    minMats?: number;
    recommendedMovement?: MovementPick;
    excludedMovements?: MovementPick[];
  },
): ActivityFamilyDefinition {
  return {
    id,
    movementProfileId,
    matRequirement: { minMats: options?.minMats ?? 1 },
    recommendedMovement: options?.recommendedMovement,
    excludedMovements: options?.excludedMovements,
  };
}

/** 인지 고난도에서 기본 제외하는 교차·고강도 조합 */
const EXCLUDE_CROSS_AND_LUNGE: MovementPick[] = [
  pick('footTap', 'oppositeSide'),
  pick('handTouch', 'oppositeSide'),
  pick('lungeReach', 'free'),
];

const EXCLUDE_CROSS_SQUAT_LUNGE: MovementPick[] = [
  ...EXCLUDE_CROSS_AND_LUNGE,
  pick('squatTouch', 'free'),
];

/** 패밀리 레지스트리 — matRequirement·공식 추천의 단일 출처 */
export const ACTIVITY_FAMILIES: Record<string, ActivityFamilyDefinition> = {
  'reaction-space-direction': family('reaction-space-direction', 'simpleColorResponse', {
    recommendedMovement: pick('footTap', 'free'),
  }),
  'reaction-quadrant': family('reaction-quadrant', 'simpleColorResponse', {
    recommendedMovement: pick('footTap', 'free'),
  }),
  'reaction-full': family('reaction-full', 'simpleColorResponse', {
    recommendedMovement: pick('handTouch', 'free'),
  }),
  'reaction-split': family('reaction-split', 'simpleColorResponse', {
    recommendedMovement: pick('footTap', 'sameSide'),
  }),
  'reaction-triple': family('reaction-triple', 'simpleColorResponse', {
    recommendedMovement: pick('footTap', 'free'),
    excludedMovements: [pick('lungeReach', 'free')],
  }),
  'reaction-triple-diff': family('reaction-triple-diff', 'simpleColorResponse', {
    recommendedMovement: pick('handTouch', 'free'),
    excludedMovements: EXCLUDE_CROSS_AND_LUNGE,
  }),
  'reaction-variant-quadrant': family('reaction-variant-quadrant', 'simpleColorResponse', {
    recommendedMovement: pick('footTap', 'free'),
  }),
  'visual-flow': family('visual-flow', 'visualSearch', {
    recommendedMovement: pick('handTouch', 'free'),
    excludedMovements: [pick('lungeReach', 'free')],
  }),
  'visual-flash': family('visual-flash', 'visualSearch', {
    recommendedMovement: pick('handTouch', 'free'),
    excludedMovements: EXCLUDE_CROSS_AND_LUNGE,
  }),
  'visual-pulse': family('visual-pulse', 'visualSearch', {
    recommendedMovement: pick('footTap', 'free'),
  }),
  'visual-blackout': family('visual-blackout', 'visualSearch', {
    recommendedMovement: pick('handTouch', 'free'),
  }),
  'visual-rush': family('visual-rush', 'visualSearch', {
    recommendedMovement: pick('handTouch', 'free'),
    excludedMovements: EXCLUDE_CROSS_AND_LUNGE,
  }),
  'visual-mole': family('visual-mole', 'visualSearch', {
    recommendedMovement: pick('footTap', 'free'),
  }),
  'visual-wormhole': family('visual-wormhole', 'visualSearch', {
    recommendedMovement: pick('handTouch', 'free'),
  }),
  'visual-number-cart': family('visual-number-cart', 'gameSpecific', {
    recommendedMovement: pick('footTap', 'free'),
  }),
  'visual-color-tracker': family('visual-color-tracker', 'gameSpecific', {
    recommendedMovement: pick('footTap', 'free'),
  }),
  'simon-pole': family('simon-pole', 'choiceReaction', {
    recommendedMovement: pick('footTap', 'free'),
    excludedMovements: EXCLUDE_CROSS_SQUAT_LUNGE,
  }),
  'simon-mixed': family('simon-mixed', 'choiceReaction', {
    recommendedMovement: pick('handTouch', 'free'),
    excludedMovements: EXCLUDE_CROSS_SQUAT_LUNGE,
  }),
  'flanker-uniform': family('flanker-uniform', 'choiceReaction', {
    recommendedMovement: pick('footTap', 'free'),
    excludedMovements: EXCLUDE_CROSS_SQUAT_LUNGE,
  }),
  'flanker-random': family('flanker-random', 'choiceReaction', {
    recommendedMovement: pick('footTap', 'free'),
    excludedMovements: EXCLUDE_CROSS_SQUAT_LUNGE,
  }),
  'flanker-5circle': family('flanker-5circle', 'choiceReaction', {
    recommendedMovement: pick('footTap', 'free'),
    excludedMovements: EXCLUDE_CROSS_SQUAT_LUNGE,
  }),
  'flanker-mixed': family('flanker-mixed', 'choiceReaction', {
    recommendedMovement: pick('footTap', 'free'),
    excludedMovements: EXCLUDE_CROSS_SQUAT_LUNGE,
  }),
  'stroop-arrow': family('stroop-arrow', 'complexReaction', {
    recommendedMovement: pick('handTouch', 'free'),
    excludedMovements: EXCLUDE_CROSS_SQUAT_LUNGE,
  }),
  'stroop-word': family('stroop-word', 'complexReaction', {
    recommendedMovement: pick('handTouch', 'free'),
    excludedMovements: EXCLUDE_CROSS_SQUAT_LUNGE,
  }),
  'stroop-missing': family('stroop-missing', 'complexReaction', {
    recommendedMovement: pick('handTouch', 'free'),
    excludedMovements: EXCLUDE_CROSS_SQUAT_LUNGE,
  }),
  'sequential-memory': family('sequential-memory', 'sequentialMemory', {
    recommendedMovement: pick('stepHold', 'free'),
    excludedMovements: [
      pick('footTap', 'oppositeSide'),
      pick('handTouch', 'oppositeSide'),
      pick('lungeReach', 'free'),
    ],
  }),
  dive: family('dive', 'diveBuiltIn'),
};

/**
 * 레거시/코어 프리셋 enrichment 입력.
 * 최종 SSOT는 enrichment 후 `preset.activityFamilyId`.
 */
export const PRESET_FAMILY_MAP: Record<string, ActivityFamilyId> = {
  'reaction-cognition-space-direction-01': 'reaction-space-direction',
  'reaction-cognition-space-direction-color-01b': 'reaction-space-direction',
  'reaction-cognition-quad-color-02': 'reaction-quadrant',
  'reaction-cognition-quad-fruit-10': 'reaction-quadrant',
  'reaction-cognition-full-color-03': 'reaction-full',
  'reaction-cognition-full-animal-18': 'reaction-full',
  'reaction-cognition-full-nature-19': 'reaction-full',
  'reaction-cognition-split-color-04': 'reaction-split',
  'reaction-cognition-triple-color-25': 'reaction-triple',
  'reaction-cognition-triple-diff-color-31': 'reaction-triple-diff',
  'reaction-cognition-mq1-32': 'reaction-variant-quadrant',
  'reaction-cognition-mq2-33': 'reaction-variant-quadrant',
  'reaction-cognition-mq3-34': 'reaction-variant-quadrant',
  'reaction-cognition-mq4-35': 'reaction-variant-quadrant',
  'reaction-cognition-mq1-32-hard': 'reaction-variant-quadrant',
  'reaction-cognition-mq2-33-hard': 'reaction-variant-quadrant',
  'reaction-cognition-mq3-34-hard': 'reaction-variant-quadrant',
  'reaction-cognition-mq4-35-hard': 'reaction-variant-quadrant',
  'visual-reaction-flow-05': 'visual-flow',
  'visual-reaction-flow-2x-31': 'visual-flow',
  'visual-reaction-flow-3x-32': 'visual-flow',
  'visual-reaction-flash-33': 'visual-flash',
  'visual-reaction-pulse-36': 'visual-pulse',
  'visual-reaction-blackout-37': 'visual-blackout',
  'visual-reaction-rush-39': 'visual-rush',
  'visual-reaction-mole-l1': 'visual-mole',
  'visual-reaction-wormhole-41': 'visual-wormhole',
  'visual-reaction-number-cart-l2': 'visual-number-cart',
  'visual-reaction-color-tracker-l2': 'visual-color-tracker',
  'simon-pole-shape-06': 'simon-pole',
  'simon-pole-arrows-41': 'simon-pole',
  'simon-mixed-gallery-exp': 'simon-mixed',
  'flanker-uniform-07': 'flanker-uniform',
  'flanker-uniform-number-exp': 'flanker-uniform',
  'flanker-random-43': 'flanker-random',
  'flanker-random-number-exp': 'flanker-random',
  'flanker-5circle-46': 'flanker-5circle',
  'flanker-5circle-number-exp': 'flanker-5circle',
  'flanker-mixed-size-exp': 'flanker-mixed',
  'flanker-mixed-size-number-exp': 'flanker-mixed',
  'stroop-arrow-reverse-08': 'stroop-arrow',
  'stroop-arrow-bg-47': 'stroop-arrow',
  'stroop-word-reverse-48': 'stroop-word',
  'stroop-word-bg-49': 'stroop-word',
  'stroop-missing-color-50': 'stroop-missing',
  'sequential-memory-3color-09': 'sequential-memory',
  'sequential-memory-5color-51': 'sequential-memory',
  'sequential-memory-10color-52': 'sequential-memory',
  'sequential-memory-full-reveal-54': 'sequential-memory',
  'sequential-memory-color-number-exp': 'sequential-memory',
  'sequential-memory-custom-10color-exp': 'sequential-memory',
  'dive-standard': 'dive',
  'dive-random': 'dive',
  'dive-color-gate-61': 'dive',
};

const LEVEL_FAMILY: Record<number, ActivityFamilyId> = {
  2: 'reaction-quadrant',
  3: 'reaction-full',
  4: 'reaction-split',
  5: 'reaction-triple',
  6: 'reaction-triple-diff',
};

/** Expansion 테마 ID → family (생성 시에도 동일 규칙) */
export function deriveFamilyIdForPresetId(presetId: string): ActivityFamilyId | null {
  const mapped = PRESET_FAMILY_MAP[presetId];
  if (mapped) return mapped;

  const themeMatch = /^reaction-cognition-l([2-6])-[a-z]+-exp$/.exec(presetId);
  if (themeMatch) {
    const level = Number(themeMatch[1]);
    return LEVEL_FAMILY[level] ?? null;
  }

  return null;
}

export function getActivityFamily(id: ActivityFamilyId): ActivityFamilyDefinition | null {
  return ACTIVITY_FAMILIES[id] ?? null;
}

export function listActivityFamilies(): ActivityFamilyDefinition[] {
  return Object.values(ACTIVITY_FAMILIES);
}
