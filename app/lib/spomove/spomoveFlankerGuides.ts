import type { SpomoveFocusTag } from './spomoveGuideContract';
import type { SpomoveGuideSeedBase } from './spomoveGuideSeedMerge';

/**
 * Flanker commercial guides (canonical remapped runtime).
 * Public runtime must NOT import this as fallback — CMS is SSOT after Admin save.
 */

export type SpomoveFlankerCluster = 'f-arrow' | 'f-random' | 'f-extreme';

export type SpomoveFlankerGuideSeed = SpomoveGuideSeedBase & {
  cluster: SpomoveFlankerCluster;
};

function tags(...focusTags: SpomoveFocusTag[]): SpomoveFocusTag[] {
  return focusTags.slice(0, 3);
}

/** REFINE pilot — center arrow direction (lr), not color. */
const ARROW_LR: SpomoveFlankerGuideSeed = {
  presetId: 'flanker-uniform-07',
  cluster: 'f-arrow',
  overwriteGuideFields: true,
  movementGuide: {
    movement: { baseMovement: 'footTap', limbRule: 'free' },
    objective: '가로로 늘어선 화살표 중 가운데 화살표가 가리키는 방향만 보고 해당 방향 패드로 이동합니다.',
    teachingPoints: [
      '주변 화살표 색·방향에 끌려가지 말고, 가운데 화살표 방향만 손가락으로 짧게 확인하게 하세요.',
      '좌·우만 나오므로 “가운데가 왼쪽인지 오른쪽인지”를 말로 확인한 뒤 이동하게 하세요.',
      '주변과 가운데가 같아도 “가운데”를 습관적으로 다시 보게 하세요.',
    ],
    instruction:
      '화면 가운데 화살표를 확인합니다.\n주변 화살표는 무시하고 가운데가 가리키는 방향을 읽습니다.\n해당 방향 패드로 이동합니다.',
    coachScript: '가운데 화살표! 방향대로 이동!',
    focusTags: tags('responseInhibition', 'directionControl', 'choiceReaction'),
    easier: '주변과 가운데가 같은 자극부터 가운데 시선을 고정합니다.',
    harder: '주변과 가운데가 다른 자극 비중을 높이고 자극 시간을 줄입니다.',
    successCriteria: '주변 화살표를 따라가지 않고 가운데 방향 패드로 이동합니다.',
    commonMistake: '양쪽 방해 화살표 방향으로 먼저 발이 나갑니다.',
  },
};

const ARROW_UDLR: SpomoveFlankerGuideSeed = {
  presetId: 'flanker-arrow-udlr-exp',
  cluster: 'f-arrow',
  movementGuide: {
    movement: { baseMovement: 'footTap', limbRule: 'free' },
    objective: '상하좌우 화살표 방해 속에서 가운데 화살표 방향만 보고 해당 방향 패드로 이동합니다.',
    teachingPoints: [
      '좌우뿐 아니라 위·아래가 섞이므로, 가운데 방향을 네 갈래로 읽게 하세요.',
      '주변이 위·아래를 유인해도 가운데만 보게 하세요.',
      '방향이 틀리면 패드를 바꾸기 전에 가운데를 다시 가리키게 하세요.',
    ],
    instruction:
      '가운데 화살표 방향을 확인합니다.\n주변 화살표는 무시합니다.\n위·아래·왼쪽·오른쪽 중 가운데가 가리키는 패드로 이동합니다.',
    coachScript: '가운데만! 상하좌우 중 그 방향!',
    focusTags: tags('responseInhibition', 'directionControl', 'choiceReaction'),
    easier: '좌우만 익숙해진 뒤 위·아래를 받아들이게 하고, 자극 시간을 늘립니다.',
    harder: '방해 방향이 가운데와 다른 자극을 늘리고 자극 시간을 줄입니다.',
    successCriteria: '상하좌우 방해 속에서도 가운데 방향만 맞춰 이동합니다.',
    commonMistake: '위·아래 방해에 끌려가거나, 좌우 습관으로만 반응합니다.',
  },
};

function themeRandomSeed(
  presetId: string,
  themeLabel: string,
  themeHint: string,
): SpomoveFlankerGuideSeed {
  return {
    presetId,
    cluster: 'f-random',
    movementGuide: {
      movement: { baseMovement: 'footTap', limbRule: 'free' },
      objective: `${themeLabel} 테마 자극이 다섯 칸에 나타날 때, 가운데 칸의 색만 보고 같은 색 패드로 이동합니다.`,
      teachingPoints: [
        `주변 ${themeHint} 이미지에 시선이 흩어지지 않게, 가운데 칸부터 보게 하세요.`,
        '이미지 종류보다 가운데 칸이 가리키는 색을 먼저 말하게 하세요.',
        '주변과 가운데 색이 다를 때 옆 칸으로 발이 나가면 가운데를 다시 가리키게 하세요.',
      ],
      instruction:
        '다섯 칸 중 가운데 칸을 먼저 봅니다.\n주변 자극은 무시하고 가운데 색을 확인합니다.\n같은 색 패드로 이동합니다.',
      coachScript: '가운데 색만! 주변은 무시!',
      focusTags: tags('responseInhibition', 'visualSearch', 'choiceReaction'),
      easier: '가운데를 손가락으로 가리킨 뒤 색을 말하고 이동하게 합니다.',
      harder: '말 없이 가운데 색→이동만 이어가게 하고 자극 시간을 줄입니다.',
      successCriteria: '테마 이미지에 끌려가지 않고 가운데 색 패드로 이동합니다.',
      commonMistake: '주변 칸의 눈에 띄는 이미지·색을 따라 이동합니다.',
    },
  };
}

const RANDOM_FRUIT = themeRandomSeed('flanker-theme-06', '과일', '과일');
const RANDOM_ANIMAL = themeRandomSeed('flanker-theme-animal-skeleton', '동물', '동물');
const RANDOM_COLOR = themeRandomSeed('flanker-theme-color-skeleton', '색상', '색 블록');
const RANDOM_FOOD = themeRandomSeed('flanker-theme-food-skeleton', '음식', '음식');
const RANDOM_NATURE = themeRandomSeed('flanker-theme-nature-skeleton', '자연', '자연');
const RANDOM_VEHICLE = themeRandomSeed('flanker-theme-vehicle-skeleton', '탈 것', '탈것');
const RANDOM_MIX = themeRandomSeed('flanker-theme-mix-skeleton', '믹스', '섞인');

function themeExtremeSeed(
  presetId: string,
  themeLabel: string,
  themeHint: string,
): SpomoveFlankerGuideSeed {
  return {
    presetId,
    cluster: 'f-extreme',
    movementGuide: {
      movement: { baseMovement: 'footTap', limbRule: 'free' },
      objective: `${themeLabel} 테마로 크기 대비가 큰 다섯 자극 중, 가운데 칸의 색만 보고 같은 색 패드로 이동합니다.`,
      teachingPoints: [
        '아주 큰 칸·아주 작은 칸에 시선이 뺏기지 않게, 가운데부터 보게 하세요.',
        `${themeHint} 디테일보다 가운데 색을 먼저 확인하게 하세요.`,
        '크기가 달라도 규칙은 같습니다. “가운데 색”만 반복해 콜하세요.',
      ],
      instruction:
        '크기 차이가 큰 다섯 자극에서 가운데를 찾습니다.\n주변은 무시하고 가운데 색을 확인합니다.\n같은 색 패드로 이동합니다.',
      coachScript: '크기 말고 가운데 색!',
      focusTags: tags('responseInhibition', 'visualSearch', 'attentionShift'),
      easier: '가운데를 손으로 가리키게 한 뒤 색을 말하고 이동하게 합니다.',
      harder: '큰 방해 자극 비중을 받아들이게 하고 자극 시간을 줄입니다.',
      successCriteria: '극단적 크기 방해 속에서도 가운데 색 패드로 이동합니다.',
      commonMistake: '가장 큰 칸의 색·이미지로 먼저 이동합니다.',
    },
  };
}

const EXTREME_FRUIT = themeExtremeSeed('flanker-random-43', '과일', '과일');
const EXTREME_ANIMAL = themeExtremeSeed('flanker-5circle-46', '동물', '동물');
const EXTREME_COLOR = themeExtremeSeed('flanker-nested-circles-04', '색상', '색');
const EXTREME_FOOD = themeExtremeSeed('flanker-arrow-05', '음식', '음식');
const EXTREME_NATURE = themeExtremeSeed('flanker-uniform-number-exp', '자연', '자연');
const EXTREME_VEHICLE = themeExtremeSeed('flanker-random-number-exp', '탈 것', '탈것');
const EXTREME_MIX = themeExtremeSeed('flanker-5circle-number-exp', '믹스', '섞인');

const EXTREME_ARROW: SpomoveFlankerGuideSeed = {
  presetId: 'flanker-extreme-arrow-hard-skeleton',
  cluster: 'f-extreme',
  movementGuide: {
    movement: { baseMovement: 'footTap', limbRule: 'free' },
    objective: '크기 대비가 큰 화살표 다섯 개 중, 가운데 화살표 방향만 보고 해당 방향 패드로 이동합니다.',
    teachingPoints: [
      '큰 화살표·작은 화살표에 끌려가지 말고 가운데 방향을 먼저 읽게 하세요.',
      '색이 아니라 가운데가 가리키는 방향이 답입니다.',
      '주변 방향과 가운데가 다를 때 한 박자 멈춘 뒤 가운데를 다시 보게 하세요.',
    ],
    instruction:
      '크기 차이가 큰 화살표 줄에서 가운데를 찾습니다.\n주변 화살표는 무시하고 가운데 방향을 확인합니다.\n해당 방향 패드로 이동합니다.',
    coachScript: '큰 화살표 말고! 가운데 방향!',
    focusTags: tags('responseInhibition', 'directionControl', 'attentionShift'),
    easier: '가운데를 가리킨 뒤 방향을 말하고 이동하게 합니다.',
    harder: '방해 방향·크기 대비를 받아들이게 하고 자극 시간을 줄입니다.',
    successCriteria: '극단 크기 화살표 방해 속에서도 가운데 방향 패드로 이동합니다.',
    commonMistake: '가장 큰 화살표 방향을 따라가거나, 색 패드로 잘못 갑니다.',
  },
};

export const SPOMOVE_FLANKER_GUIDE_SEEDS: readonly SpomoveFlankerGuideSeed[] = [
  ARROW_LR,
  ARROW_UDLR,
  RANDOM_FRUIT,
  RANDOM_ANIMAL,
  RANDOM_COLOR,
  RANDOM_FOOD,
  RANDOM_NATURE,
  RANDOM_VEHICLE,
  RANDOM_MIX,
  EXTREME_FRUIT,
  EXTREME_ANIMAL,
  EXTREME_COLOR,
  EXTREME_FOOD,
  EXTREME_NATURE,
  EXTREME_VEHICLE,
  EXTREME_MIX,
  EXTREME_ARROW,
];

export const SPOMOVE_FLANKER_SEED_PRESET_IDS = SPOMOVE_FLANKER_GUIDE_SEEDS.map((entry) => entry.presetId);

export function listFlankerSeedsByCluster(cluster: SpomoveFlankerCluster): SpomoveFlankerGuideSeed[] {
  return SPOMOVE_FLANKER_GUIDE_SEEDS.filter((entry) => entry.cluster === cluster);
}
