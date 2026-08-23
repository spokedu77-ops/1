import type { SpomoveFocusTag } from './spomoveGuideContract';
import type { SpomoveGuideSeedBase } from './spomoveGuideSeedMerge';

/**
 * Simon commercial guides.
 * Public runtime must NOT import this as fallback — CMS is SSOT after Admin save.
 */

export type SpomoveSimonCluster = 's1-poles' | 's2-camouflage' | 's3-balloon';

export type SpomoveSimonGuideSeed = SpomoveGuideSeedBase & {
  cluster: SpomoveSimonCluster;
};

function tags(...focusTags: SpomoveFocusTag[]): SpomoveFocusTag[] {
  return focusTags.slice(0, 3);
}

const SHAPE_1: SpomoveSimonGuideSeed = {
  presetId: 'simon-pole-shape-06',
  cluster: 's1-poles',
  movementGuide: {
    movement: { baseMovement: 'footTap', limbRule: 'free' },
    objective: '극단에 나타난 도형의 위치가 아니라 도형 색을 보고 같은 색 패드로 이동합니다.',
    teachingPoints: [
      '도형이 뜬 쪽으로 자동 이동하지 말고, 색을 말한 뒤 패드를 고르게 하세요.',
      '위치와 색이 어긋난 자극에서 발이 위치 쪽으로 나가면 한 박자 멈춘 뒤 색을 다시 읽게 하세요.',
      '교사가 색 선택을 눈으로 확인합니다. 화면 점수에 의존하지 마세요.',
    ],
    instruction:
      '극단에 나타난 도형을 확인합니다.\n위치가 아니라 도형 색을 읽습니다.\n같은 색 패드로 이동합니다.',
    coachScript: '위치 말고 색! 색 보고 이동!',
    focusTags: tags('responseInhibition', 'choiceReaction', 'attentionShift'),
    easier: '색을 짧게 말한 뒤 이동하게 하고, 자극 시간을 늘립니다.',
    harder: '말 없이 색→이동만 이어가게 하고, 위치-색 불일치를 더 자주 확인합니다.',
    successCriteria: '도형 위치에 끌려가지 않고 색 패드로 이동합니다.',
    commonMistake: '도형이 나타난 가장자리 방향으로 먼저 발이 나갑니다.',
  },
};

const SHAPE_2: SpomoveSimonGuideSeed = {
  presetId: 'simon-shape-hard-skeleton',
  cluster: 's1-poles',
  movementGuide: {
    movement: { baseMovement: 'footTap', limbRule: 'free' },
    objective: '극단 두 곳에 동시에 나타난 도형의 색을 각각 읽고, 위치는 무시한 채 맞는 색 패드로 반응합니다.',
    teachingPoints: [
      '한 도형만 보고 끝내지 말고, 두 색을 모두 말하게 하세요.',
      '두 위치가 달라도 답은 색입니다. 위치 쪽으로 쪼개져 가지 않게 하세요.',
      '교사가 두 색 반응을 확인한 뒤에 다음 자극으로 넘기세요.',
    ],
    instruction:
      '극단 두 곳에 뜬 도형을 확인합니다.\n각 도형의 색을 읽습니다.\n위치는 무시하고 해당 색 패드로 반응합니다.',
    coachScript: '두 개! 위치 말고 두 색!',
    focusTags: tags('responseInhibition', 'choiceReaction', 'attentionShift'),
    easier: '한 자극부터 익힌 뒤 동시 2개를 받아들이고, 자극 시간을 늘립니다.',
    harder: '말 없이 두 색을 바로 연결하게 하고 자극 시간을 줄입니다.',
    successCriteria: '동시 2개 도형에서 위치를 따라가지 않고 두 색 모두 맞게 반응합니다.',
    commonMistake: '한 쪽 위치만 쫓거나, 두 색 중 하나만 반응합니다.',
  },
};

/** REFINE pilot — arrow direction, not color. */
const ARROW_1: SpomoveSimonGuideSeed = {
  presetId: 'simon-pole-arrows-41',
  cluster: 's1-poles',
  overwriteGuideFields: true,
  movementGuide: {
    movement: { baseMovement: 'footTap', limbRule: 'free' },
    objective: '극단에 나타난 화살표의 위치가 아니라 화살표가 가리키는 방향을 보고 해당 방향 패드로 이동합니다.',
    teachingPoints: [
      '화살표가 뜬 가장자리로 가지 말고, 화살표 방향을 먼저 말하게 하세요.',
      '위치와 방향이 충돌할 때 발이 위치 쪽으로 나가면 멈추고 방향을 다시 읽게 하세요.',
      '색이 답이 아닙니다. 방향 패드로 가는지 교사가 확인하세요.',
    ],
    instruction:
      '극단에 나타난 화살표를 확인합니다.\n위치가 아니라 화살표가 가리키는 방향을 읽습니다.\n해당 방향 패드로 이동합니다.',
    coachScript: '위치 말고 방향! 화살표가 가리키는 쪽!',
    focusTags: tags('responseInhibition', 'directionControl', 'choiceReaction'),
    easier: '방향을 짧게 말한 뒤 이동하게 하고, 자극 시간을 늘립니다.',
    harder: '말 없이 방향→이동만 이어가게 하고, 위치-방향 충돌을 더 자주 확인합니다.',
    successCriteria: '화살표 위치에 끌려가지 않고 방향 패드로 이동합니다.',
    commonMistake: '화살표가 나타난 위치로 가거나, 색 패드로 잘못 반응합니다.',
  },
};

const ARROW_2: SpomoveSimonGuideSeed = {
  presetId: 'simon-arrow-hard-skeleton',
  cluster: 's1-poles',
  movementGuide: {
    movement: { baseMovement: 'footTap', limbRule: 'free' },
    objective: '극단 두 곳에 동시에 나타난 화살표 방향을 각각 읽고, 위치는 무시한 채 해당 방향 패드로 반응합니다.',
    teachingPoints: [
      '두 화살표의 방향을 모두 확인하게 하세요. 한 쪽만 보고 끝내지 마세요.',
      '답은 방향입니다. 뜬 위치로 쪼개져 가지 않게 하세요.',
      '교사가 두 방향 반응을 확인한 뒤 다음으로 넘기세요.',
    ],
    instruction:
      '극단 두 곳의 화살표를 확인합니다.\n각 화살표가 가리키는 방향을 읽습니다.\n위치는 무시하고 해당 방향 패드로 반응합니다.',
    coachScript: '두 화살표! 위치 말고 두 방향!',
    focusTags: tags('responseInhibition', 'directionControl', 'attentionShift'),
    easier: '한 화살표부터 익힌 뒤 동시 2개를 받아들이고, 자극 시간을 늘립니다.',
    harder: '말 없이 두 방향을 바로 연결하게 하고 자극 시간을 줄입니다.',
    successCriteria: '동시 2개 화살표에서 위치를 따라가지 않고 두 방향 모두 맞게 반응합니다.',
    commonMistake: '한 쪽 위치만 쫓거나, 두 방향 중 하나만 반응합니다.',
  },
};

const THEME_1: SpomoveSimonGuideSeed = {
  presetId: 'simon-mixed-gallery-exp',
  cluster: 's1-poles',
  movementGuide: {
    movement: { baseMovement: 'footTap', limbRule: 'free' },
    objective: '테마 이미지가 극단에 나타날 때 위치가 아니라 이미지 색을 보고 같은 색 패드로 이동합니다.',
    teachingPoints: [
      '이미지 종류(과일·동물 등)에 시선이 머무르면 색을 놓칩니다. 색을 먼저 말하게 하세요.',
      '이미지가 뜬 쪽으로 자동 이동하지 않게 하세요.',
      '교사가 색 선택을 확인합니다. 추측으로 다음 자극에 넘어가지 마세요.',
    ],
    instruction:
      '극단에 나타난 테마 이미지를 확인합니다.\n위치가 아니라 이미지 색을 읽습니다.\n같은 색 패드로 이동합니다.',
    coachScript: '그림 말고 색! 색 보고 이동!',
    focusTags: tags('responseInhibition', 'choiceReaction', 'visualSearch'),
    easier: '색을 말한 뒤 이동하게 하고, 자극 시간을 늘립니다.',
    harder: '말 없이 색→이동만 이어가게 하고 자극 시간을 줄입니다.',
    successCriteria: '테마 이미지 위치에 끌려가지 않고 색 패드로 이동합니다.',
    commonMistake: '이미지가 뜬 가장자리로 가거나, 이미지 이름만 말하고 색을 놓칩니다.',
  },
};

const THEME_2: SpomoveSimonGuideSeed = {
  presetId: 'simon-random-hard-skeleton',
  cluster: 's1-poles',
  movementGuide: {
    movement: { baseMovement: 'footTap', limbRule: 'free' },
    objective: '극단 두 곳에 동시에 나타난 테마 이미지의 색을 각각 읽고, 위치는 무시한 채 맞는 색 패드로 반응합니다.',
    teachingPoints: [
      '두 이미지의 색을 모두 확인하게 하세요.',
      '종류가 달라도 답은 색입니다. 위치·그림에 끌리지 않게 하세요.',
      '교사가 두 색 반응을 확인한 뒤 다음으로 넘기세요.',
    ],
    instruction:
      '극단 두 곳의 테마 이미지를 확인합니다.\n각 이미지의 색을 읽습니다.\n위치는 무시하고 해당 색 패드로 반응합니다.',
    coachScript: '두 그림! 위치 말고 두 색!',
    focusTags: tags('responseInhibition', 'choiceReaction', 'attentionShift'),
    easier: '한 이미지부터 익힌 뒤 동시 2개를 받아들이고, 자극 시간을 늘립니다.',
    harder: '말 없이 두 색을 바로 연결하게 하고 자극 시간을 줄입니다.',
    successCriteria: '동시 2개 테마에서 위치를 따라가지 않고 두 색 모두 맞게 반응합니다.',
    commonMistake: '한 쪽만 쫓거나, 그림 종류에 시선이 남아 색을 놓칩니다.',
  },
};

const CAMO_NORMAL: SpomoveSimonGuideSeed = {
  presetId: 'simon-camouflage-center-skeleton',
  cluster: 's2-camouflage',
  movementGuide: {
    movement: { baseMovement: 'footTap', limbRule: 'free' },
    objective: '노이즈에 섞인 색 자극을 넓은 시야로 찾아, 찾은 색 패드로 이동합니다.',
    teachingPoints: [
      '화면 한곳만 응시하지 말고 극단·가장자리까지 시야를 넓히게 하세요.',
      '위장 속에서 색이 드러나는 순간을 포착하게 하세요.',
      '교사가 찾은 색 반응을 확인합니다. 추측 이동을 줄이세요.',
    ],
    instruction:
      '노이즈 화면 전체를 넓게 봅니다.\n위장된 색 자극이 드러나면 색을 확인합니다.\n같은 색 패드로 이동합니다.',
    coachScript: '넓게 보고, 색 찾으면 이동!',
    focusTags: tags('visualSearch', 'choiceReaction', 'attentionShift'),
    easier: '자극 시간을 늘리고, 색이 보이면 손가락으로 가리킨 뒤 이동하게 합니다.',
    harder: '자극 시간을 줄이고, 말 없이 탐색→이동만 이어가게 합니다.',
    successCriteria: '넓은 시야로 위장 색을 찾아 같은 색 패드로 이동합니다.',
    commonMistake: '화면 중앙만 보고 극단·가장자리 자극을 놓칩니다.',
  },
};

const CAMO_HARD: SpomoveSimonGuideSeed = {
  presetId: 'visual-reaction-blackout-37',
  cluster: 's2-camouflage',
  movementGuide: {
    movement: { baseMovement: 'footTap', limbRule: 'free' },
    objective: '노이즈 속 위장 자극을 극단·넓은 시야로 더 빠르게 찾아, 찾은 색 패드로 이동합니다.',
    teachingPoints: [
      '중앙 고정 시선을 깨고, 가장자리까지 훑는 습관을 강조하세요.',
      '짧게 보이는 위장 색을 놓치면 다음 자극에서 시야를 다시 넓히게 하세요.',
      '교사가 색 반응을 확인합니다. 급하게 아무 패드로 가지 않게 하세요.',
    ],
    instruction:
      '노이즈 화면의 극단·가장자리까지 넓게 봅니다.\n위장된 색이 드러나면 바로 색을 확인합니다.\n같은 색 패드로 이동합니다.',
    coachScript: '가장자리까지! 색 잡으면 바로 이동!',
    focusTags: tags('visualSearch', 'choiceReaction', 'attentionShift'),
    easier: '자극 시간을 늘리고, 색을 가리킨 뒤 이동하게 합니다.',
    harder: '자극 시간을 줄이고, 연속 탐색에서 시야가 좁아지지 않게 합니다.',
    successCriteria: '극단·넓은 시야로 위장 색을 놓치지 않고 같은 색 패드로 이동합니다.',
    commonMistake: '중앙만 보다가 극단 자극을 놓치거나, 색 확인 전에 익숙한 패드로 갑니다.',
  },
};

const BALLOON_1: SpomoveSimonGuideSeed = {
  presetId: 'simon-balloon-flash-05',
  cluster: 's3-balloon',
  movementGuide: {
    movement: { baseMovement: 'footTap', limbRule: 'free' },
    objective: '화면 어디에 나타나든 풍선 색을 보고, 위치는 무시한 채 같은 색 패드로 이동합니다.',
    teachingPoints: [
      '풍선이 뜬 위치로 가지 말고 색을 먼저 확인하게 하세요.',
      '순간 등장에 놀라 아무 패드로 뛰지 않게, 색을 말한 뒤 이동하게 하세요.',
      '교사가 색 반응을 확인합니다.',
    ],
    instruction:
      '나타난 풍선을 확인합니다.\n위치가 아니라 풍선 색을 읽습니다.\n같은 색 패드로 이동합니다.',
    coachScript: '풍선 위치 말고 색!',
    focusTags: tags('responseInhibition', 'choiceReaction', 'simpleReaction'),
    easier: '색을 말한 뒤 이동하게 하고, 자극 간격을 늘립니다.',
    harder: '말 없이 색→이동만 이어가게 하고 간격을 줄입니다.',
    successCriteria: '풍선 위치에 끌려가지 않고 색 패드로 이동합니다.',
    commonMistake: '풍선이 뜬 쪽 가장자리로 먼저 이동합니다.',
  },
};

const BALLOON_2: SpomoveSimonGuideSeed = {
  presetId: 'simon-balloon-hard-skeleton',
  cluster: 's3-balloon',
  movementGuide: {
    movement: { baseMovement: 'footTap', limbRule: 'free' },
    objective: '동시에 나타난 풍선 두 개의 색을 각각 읽고, 위치는 무시한 채 맞는 색 패드로 반응합니다.',
    teachingPoints: [
      '두 풍선의 색을 모두 확인하게 하세요.',
      '한 풍선 위치만 쫓지 말고 두 색을 연결하게 하세요.',
      '교사가 두 색 반응을 확인한 뒤 다음으로 넘기세요.',
    ],
    instruction:
      '동시에 뜬 풍선 두 개를 확인합니다.\n각 풍선 색을 읽습니다.\n위치는 무시하고 해당 색 패드로 반응합니다.',
    coachScript: '풍선 두 개! 위치 말고 두 색!',
    focusTags: tags('responseInhibition', 'choiceReaction', 'attentionShift'),
    easier: '한 풍선부터 익힌 뒤 동시 2개를 받아들이고, 간격을 늘립니다.',
    harder: '말 없이 두 색을 바로 연결하게 하고 간격을 줄입니다.',
    successCriteria: '동시 2개 풍선에서 위치를 따라가지 않고 두 색 모두 맞게 반응합니다.',
    commonMistake: '한 풍선만 보고 반대 색을 놓칩니다.',
  },
};

export const SPOMOVE_SIMON_GUIDE_SEEDS: readonly SpomoveSimonGuideSeed[] = [
  SHAPE_1,
  SHAPE_2,
  ARROW_1,
  ARROW_2,
  THEME_1,
  THEME_2,
  CAMO_NORMAL,
  CAMO_HARD,
  BALLOON_1,
  BALLOON_2,
];

export const SPOMOVE_SIMON_SEED_PRESET_IDS = SPOMOVE_SIMON_GUIDE_SEEDS.map((entry) => entry.presetId);

export function listSimonSeedsByCluster(cluster: SpomoveSimonCluster): SpomoveSimonGuideSeed[] {
  return SPOMOVE_SIMON_GUIDE_SEEDS.filter((entry) => entry.cluster === cluster);
}
