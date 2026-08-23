import { FULL_THEME_SEEDS } from '@/app/spokedu-master/spomove/operations/fullThemeSeed';
import type { MovementPick } from '@/app/spokedu-master/spomove/movements/movementTypes';

import type { SpomoveMovementGuideDraft, SpomoveFocusTag } from './spomoveGuideContract';
import type { SpomovePresetContentOverride } from './spomoveOfficialAssets';

/**
 * Reaction-cognition commercial guides (Batch 04).
 * Public runtime must NOT import this as fallback — CMS is SSOT after Admin save.
 */

export type SpomoveGuideSeedEntry = {
  presetId: string;
  cluster: 'L1-space' | 'L2-quad' | 'L3-full' | 'L4-split';
  theme?: 'color' | 'fruit' | 'animal' | 'food' | 'nature' | 'vehicle' | 'mix' | 'color-arrow';
  movementGuide: SpomoveMovementGuideDraft;
};

type ThemeId = 'color' | 'fruit' | 'animal' | 'food' | 'nature' | 'vehicle' | 'mix';

const L3_MOVEMENT_LABEL: Record<ThemeId, string> = {
  color: '양발 점프',
  fruit: '한발 Hop',
  animal: '바운딩 스텝',
  food: '퀵스텝',
  nature: '런지 리치',
  vehicle: '플랭크 터치',
  mix: '퀵스텝',
};

function tags(...focusTags: SpomoveFocusTag[]): SpomoveFocusTag[] {
  return focusTags.slice(0, 3);
}

function l3Movement(theme: ThemeId): MovementPick {
  return FULL_THEME_SEEDS[theme].recommendedMovement;
}

function l3FocusTags(theme: ThemeId): SpomoveFocusTag[] {
  if (theme === 'vehicle') {
    return tags('simpleReaction', 'choiceReaction', 'upperLowerCoordination');
  }
  if (theme === 'fruit' || theme === 'nature') {
    return tags('simpleReaction', 'choiceReaction', 'balanceControl');
  }
  return tags('simpleReaction', 'choiceReaction', 'lowerBodyCoordination');
}

/** L1 color arrow — same mechanics as basic arrow with fixed color-direction mapping. */
const L1_COLOR_ARROW: SpomoveGuideSeedEntry = {
  presetId: 'reaction-cognition-space-direction-color-01b',
  cluster: 'L1-space',
  theme: 'color-arrow',
  movementGuide: {
    movement: { baseMovement: 'footTap', limbRule: 'free' },
    objective: '색으로 채워진 화살표의 방향을 구분하고 해당 방향 패드로 정확하게 이동합니다.',
    teachingPoints: [
      '화살표 안 색보다 가리키는 방향을 먼저 확인하게 하세요.',
      '위·좌·우·아래 색 매핑을 말로 확인한 뒤, 방향만 보고 이동하게 하세요.',
    ],
    instruction:
      '중앙 색상 화살표의 방향을 확인합니다.\n화살표가 가리키는 방향 패드로 이동합니다.\n색 매핑(위빨·좌초·우노·하파)은 방향을 돕는 단서일 뿐입니다.',
    coachScript: '색이 아니라 방향! 화살표가 가리키는 쪽으로 이동하세요.',
    focusTags: tags('choiceReaction', 'directionControl', 'lowerBodyCoordination'),
    easier: '방향을 짧게 말한 뒤 이동하게 하고, 자극 시간을 늘립니다.',
    harder: '자극 시간을 줄이고, 색을 말하지 않고 방향만으로 이동하게 합니다.',
    successCriteria: '다른 방향 패드를 밟지 않고 화살표 방향과 맞는 위치로 이동합니다.',
    commonMistake: '화살표 안 색과 같은 패드로 먼저 가려 합니다.',
  },
};

const THEME_LABEL: Record<ThemeId, string> = {
  color: '색상',
  fruit: '과일',
  animal: '동물',
  food: '음식',
  nature: '자연',
  vehicle: '탈 것',
  mix: '믹스',
};

function isImageTheme(theme: ThemeId): boolean {
  return theme !== 'color';
}

function cueNoun(theme: ThemeId): string {
  return theme === 'color' ? '색상 신호' : `${THEME_LABEL[theme]} 이미지 신호`;
}

function l2Quad(presetId: string, theme: ThemeId): SpomoveGuideSeedEntry {
  const cue = cueNoun(theme);
  const imageDelta =
    theme === 'mix'
      ? '여러 종류의 이미지가 바뀌어도 화면 칸 위치와 연결된 패드만 보고 이동하게 하세요.'
      : isImageTheme(theme)
        ? '이미지 이름보다 어느 칸에 나타났는지 먼저 확인하게 하세요.'
        : '어느 칸에 색이 켜졌는지 먼저 확인한 뒤 패드로 연결하게 하세요.';

  return {
    presetId,
    cluster: 'L2-quad',
    theme,
    movementGuide: {
      movement: { baseMovement: 'footTap', limbRule: 'free' },
      objective: `2×2 화면에서 ${cue}가 나타난 칸을 확인하고 연결된 SPOMAT 패드로 이동합니다.`,
      teachingPoints: [
        '화면의 어느 칸에 자극이 나타났는지 먼저 확인하세요.',
        imageDelta,
        '위치가 맞으면 그다음에 속도를 높입니다.',
      ].slice(0, 3),
      instruction:
        `2×2 그리드에서 ${cue}가 나타난 칸을 확인합니다.\n그 칸과 연결된 색 패드로 이동합니다.\n다음 자극이 나올 때까지 자리를 유지합니다.`,
      coachScript: '어느 칸인지 보고, 그 패드로 이동!',
      focusTags: tags('choiceReaction', 'visualSearch', 'lowerBodyCoordination'),
      easier: '자극이 나타난 칸을 손가락으로 가리키게 한 뒤 이동하게 하고, 자극 시간을 늘립니다.',
      harder: '자극 시간을 줄이고, 칸을 말하지 않고 바로 이동하게 합니다.',
      successCriteria: '자극이 없는 칸으로 가지 않고, 나타난 칸과 연결된 패드로 이동합니다.',
      commonMistake: '화면 칸을 확인하기 전에 익숙한 패드로 먼저 움직입니다.',
    },
  };
}

function l3Full(presetId: string, theme: ThemeId): SpomoveGuideSeedEntry {
  const cue = cueNoun(theme);
  const moveLabel = L3_MOVEMENT_LABEL[theme];
  const imageDelta =
    theme === 'mix'
      ? '이미지 종류가 바뀌어도 “전체 화면의 한 신호 → 연결 패드” 규칙만 유지하게 하세요.'
      : isImageTheme(theme)
        ? '이미지 세부보다 신호가 가리키는 연결 색/패드를 먼저 확인하게 하세요.'
        : '전체 화면 색을 확인한 뒤 같은 색 패드로 바로 연결하게 하세요.';

  return {
    presetId,
    cluster: 'L3-full',
    theme,
    movementGuide: {
      movement: l3Movement(theme),
      objective: `전체 화면에 크게 나타난 ${cue}를 확인하고 연결된 SPOMAT 패드로 ${moveLabel}합니다.`,
      teachingPoints: [
        '화면을 네 칸처럼 나누어 찾지 말고, 하나의 큰 신호를 확인하게 하세요.',
        imageDelta,
        `신호 확인 후 ${moveLabel}로 패드를 연결하는지 관찰하세요.`,
      ].slice(0, 3),
      instruction:
        `전체형 화면에 나타난 ${cue}를 확인합니다.\n연결된 색 패드로 ${moveLabel}합니다.\n칸 위치를 찾는 활동이 아니라 단일 신호에 반응합니다.`,
      coachScript: `화면 전체를 보고, 같은 패드로 ${moveLabel}!`,
      focusTags: l3FocusTags(theme),
      easier: `동작을 ${moveLabel} 대신 가볍게 밟기로 바꾸고, 자극 시간을 늘립니다.`,
      harder: '자극 시간을 줄이고, 말 없이 신호→이동만 이어지게 합니다.',
      successCriteria: `다른 색 패드를 밟지 않고 신호와 연결된 패드로 ${moveLabel}합니다.`,
      commonMistake: '4분할처럼 화면을 칸으로 나누어 찾으려 합니다.',
      variations: {
        movement: `공식 권장 동작은 ${moveLabel}입니다. 수준에 맞게 발 탭으로 바꿀 수 있습니다.`,
      },
    },
  };
}

function l4Split(presetId: string, theme: ThemeId): SpomoveGuideSeedEntry {
  const cue = cueNoun(theme);
  const imageDelta =
    theme === 'mix'
      ? '좌우 패널의 이미지 종류가 달라도, 각 패널 신호에 맞는 패드로 연결하는지 확인하세요.'
      : isImageTheme(theme)
        ? '좌·우 패널 이미지를 모두 본 뒤 연결 패드로 이동하게 하세요.'
        : '좌·우 패널 색을 확인한 뒤 맞는 패드로 이동하게 하세요.';

  return {
    presetId,
    cluster: 'L4-split',
    theme,
    movementGuide: {
      movement: { baseMovement: 'footTap', limbRule: 'sameSide' },
      objective: `좌우 두 패널에 나타난 ${cue}를 확인하고 연결된 SPOMAT 패드로 이동합니다.`,
      teachingPoints: [
        '한쪽 패널만 보고 움직이지 말고 좌우 패널을 함께 확인하게 하세요.',
        imageDelta,
        '같은 쪽 발/손으로 패드를 밟는지 확인하고, 시선이 한쪽에 고정되면 반대 패널을 가리키게 하세요.',
      ].slice(0, 3),
      instruction:
        `2분할 화면의 좌우 패널에 나타난 ${cue}를 확인합니다.\n신호와 연결된 색 패드로 같은 쪽 발을 사용해 이동합니다.\n한 패널만 보고 추측해 움직이지 않습니다.`,
      coachScript: '왼쪽·오른쪽 둘 다 보고, 맞는 패드로 이동!',
      focusTags: tags('choiceReaction', 'attentionShift', 'lowerBodyCoordination'),
      easier: '한쪽 패널부터 확인하게 한 뒤 반대쪽을 보게 하고, 자극 시간을 늘립니다.',
      harder: '자극 시간을 줄이고, 패널을 짧게 확인한 뒤 바로 이동하게 합니다.',
      successCriteria: '한쪽 패널만 보고 틀린 패드로 가지 않고, 신호에 맞는 패드로 이동합니다.',
      commonMistake: '가까운 쪽 패널만 보고 바로 이동합니다.',
    },
  };
}

export const SPOMOVE_REACTION_COGNITION_GUIDE_SEEDS: readonly SpomoveGuideSeedEntry[] = [
  L1_COLOR_ARROW,
  // L2 quad
  l2Quad('reaction-cognition-quad-color-02', 'color'),
  l2Quad('reaction-cognition-quad-fruit-10', 'fruit'),
  l2Quad('reaction-cognition-l2-animal-exp', 'animal'),
  l2Quad('reaction-cognition-l2-food-exp', 'food'),
  l2Quad('reaction-cognition-l2-nature-exp', 'nature'),
  l2Quad('reaction-cognition-l2-vehicle-exp', 'vehicle'),
  l2Quad('reaction-cognition-l2-mix-exp', 'mix'),
  // L3 full
  l3Full('reaction-cognition-full-color-03', 'color'),
  l3Full('reaction-cognition-full-animal-18', 'animal'),
  l3Full('reaction-cognition-full-nature-19', 'nature'),
  l3Full('reaction-cognition-l3-fruit-exp', 'fruit'),
  l3Full('reaction-cognition-l3-food-exp', 'food'),
  l3Full('reaction-cognition-l3-vehicle-exp', 'vehicle'),
  l3Full('reaction-cognition-l3-mix-exp', 'mix'),
  // L4 split
  l4Split('reaction-cognition-split-color-04', 'color'),
  l4Split('reaction-cognition-l4-fruit-exp', 'fruit'),
  l4Split('reaction-cognition-l4-animal-exp', 'animal'),
  l4Split('reaction-cognition-l4-food-exp', 'food'),
  l4Split('reaction-cognition-l4-nature-exp', 'nature'),
  l4Split('reaction-cognition-l4-vehicle-exp', 'vehicle'),
  l4Split('reaction-cognition-l4-mix-exp', 'mix'),
];

export const SPOMOVE_REACTION_COGNITION_SEED_PRESET_IDS = SPOMOVE_REACTION_COGNITION_GUIDE_SEEDS.map(
  (entry) => entry.presetId,
);

function isBlankGuideValue(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (typeof value === 'string') return !value.trim();
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

/** Merge seed guide into existing override — existing non-blank wins. */
export function mergeSpomoveGuideSeedOverride(
  current: SpomovePresetContentOverride | undefined,
  seed: SpomoveGuideSeedEntry,
): SpomovePresetContentOverride {
  const existingGuide = current?.movementGuide ?? {};
  const mergedGuide: SpomoveMovementGuideDraft = { ...existingGuide };
  for (const [key, value] of Object.entries(seed.movementGuide) as Array<
    [keyof SpomoveMovementGuideDraft, SpomoveMovementGuideDraft[keyof SpomoveMovementGuideDraft]]
  >) {
    if (isBlankGuideValue(mergedGuide[key])) {
      (mergedGuide as Record<string, unknown>)[key] = value;
    }
  }
  return {
    ...current,
    movementGuide: mergedGuide,
    movementGuideStatus: current?.movementGuideStatus ?? 'draft',
  };
}
