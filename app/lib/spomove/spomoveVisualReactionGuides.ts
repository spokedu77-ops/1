import type { SpomoveFocusTag } from './spomoveGuideContract';
import type { SpomoveGuideSeedBase } from './spomoveGuideSeedMerge';

/**
 * Visual-reaction commercial guides (Batch 05B).
 * Public runtime must NOT import this as fallback — CMS is SSOT after Admin save.
 */

export type SpomoveVisualReactionCluster =
  | 'rush-flow-flash'
  | 'mole'
  | 'hand-foot'
  | 'goalkeeper';

export type SpomoveVisualReactionGuideSeed = SpomoveGuideSeedBase & {
  cluster: SpomoveVisualReactionCluster;
};

function tags(...focusTags: SpomoveFocusTag[]): SpomoveFocusTag[] {
  return focusTags.slice(0, 3);
}

const RUSH: SpomoveVisualReactionGuideSeed = {
  presetId: 'visual-reaction-rush-39',
  cluster: 'rush-flow-flash',
  movementGuide: {
    movement: { baseMovement: 'handTouch', limbRule: 'free' },
    objective: '원근 레일로 다가오는 파도 색을 연속으로 읽고 같은 색 패드로 이동한 뒤, 히트 타이밍에 점프합니다.',
    teachingPoints: [
      '한 파도에 반응한 뒤 멈추지 말고 다음 파도로 시선을 바로 옮기게 하세요.',
      '이전 색에 발이 남아 있으면 “다음 색”을 말하게 한 뒤 다시 출발하게 하세요.',
      '정확도가 안정되면 그다음에 연속 속도를 올립니다.',
    ],
    instruction:
      '다가오는 파도 색을 확인합니다.\n같은 색 패드로 이동합니다.\n파도가 히트라인에 닿는 타이밍에 점프합니다.',
    coachScript: '색 보고 이동! 터질 때 점프!',
    focusTags: tags('simpleReaction', 'visualSearch', 'lowerBodyCoordination'),
    easier: '한 파도씩 색을 말한 뒤 이동하게 하고, 자극 속도를 낮춥니다.',
    harder: '말 없이 연속 반응만 이어가게 하고, 히트 직후 중앙으로 빠르게 복귀합니다.',
    successCriteria: '이전 자극에 시선·발이 남지 않고, 연속으로 맞는 색 패드로 이동합니다.',
    commonMistake: '한 파도에 반응한 뒤 멈춰서 다음 파도를 놓칩니다.',
  },
};

const FLOW: SpomoveVisualReactionGuideSeed = {
  presetId: 'visual-reaction-flow-2x-31',
  cluster: 'rush-flow-flash',
  movementGuide: {
    movement: { baseMovement: 'handTouch', limbRule: 'free' },
    objective: '동시에 떨어지는 두 색 벽돌을 확인하고 각 색 패드에 한 발씩 맞춰 히트 타이밍에 반응합니다.',
    teachingPoints: [
      '한 색만 따라가지 말고 두 색을 동시에 읽게 하세요.',
      '양발을 한 패드에 모으면 “한 발씩”을 다시 콜하세요.',
      '색을 미리 밟아 두지 말고 히트라인에 닿는 순간을 기준으로 하세요.',
    ],
    instruction:
      '동시에 떨어지는 두 색을 확인합니다.\n해당 색 패드 두 곳에 왼발·오른발을 한 발씩 놓습니다.\n벽돌이 히트라인에 닿는 타이밍에 양발 반응을 맞춥니다.',
    coachScript: '두 개 보고, 한 발씩!',
    focusTags: tags('choiceReaction', 'visualSearch', 'lowerBodyCoordination'),
    easier: '두 색을 손가락으로 가리키게 한 뒤 양발을 놓게 하고, 낙하 속도를 낮춥니다.',
    harder: '말 없이 두 색을 바로 연결하게 하고, 히트 후 중앙 복귀를 빠르게 합니다.',
    successCriteria: '두 색을 모두 읽고 서로 다른 패드에 한 발씩 맞춰 반응합니다.',
    commonMistake: '두 벽돌 중 한 색만 보고 한쪽으로만 이동합니다.',
  },
};

/** Flash Pilot REFINE — pad move + clap at pop (coach rule; screen confirms at spike). */
const FLASH: SpomoveVisualReactionGuideSeed = {
  presetId: 'visual-reaction-flash-33',
  cluster: 'rush-flow-flash',
  overwriteGuideFields: true,
  movementGuide: {
    movement: { baseMovement: 'handTouch', limbRule: 'free' },
    objective: '떨어지는 색 풍선을 추적해 같은 색 패드로 이동하고, 가시에 닿아 터지는 순간에 박수로 반응합니다.',
    teachingPoints: [
      '풍선이 내려오기 시작하자마자 움직이지 말고, 가시에 닿는 순간까지 색을 추적하게 하세요.',
      '패드로 미리 가 있어도, 터지는 타이밍의 박수가 빠지지 않는지 확인하세요.',
      '한 풍선에만 시선이 남으면 다음 낙하를 놓치므로 터진 뒤 바로 위를 보게 하세요.',
    ],
    instruction:
      '떨어지는 색 풍선을 눈으로 추적합니다.\n같은 색 패드로 이동합니다.\n풍선이 하단 가시에 닿아 터질 때 박수로 반응합니다.',
    coachScript: '끝까지 보고, 터질 때 박수!',
    focusTags: tags('visualSearch', 'simpleReaction', 'upperLowerCoordination'),
    easier: '낙하 속도를 낮추고, 색을 말한 뒤 패드로 이동하게 합니다.',
    harder: '말 없이 추적→이동→박수만 이어가게 하고, 다음 풍선으로 시선을 빠르게 옮깁니다.',
    successCriteria: '가시 접촉 순간을 기준으로 같은 색 패드 이동과 박수가 함께 이뤄집니다.',
    commonMistake: '풍선이 가시에 닿기 전에 미리 박수하거나, 색을 확인하기 전에 익숙한 패드로 갑니다.',
  },
};

const MOLE_CLASSIC: SpomoveVisualReactionGuideSeed = {
  presetId: 'visual-reaction-mole-l1',
  cluster: 'mole',
  movementGuide: {
    movement: { baseMovement: 'footTap', limbRule: 'free' },
    objective: '구멍에서 튀어나온 색 두더지 1마리를 찾아 같은 색 패드로 빠르게 반응합니다.',
    teachingPoints: [
      '두더지가 뜨기 전에 예상 패드로 미리 가지 않게 하세요.',
      '팝업이 나온 뒤 위치→색 순으로 읽게 하세요.',
      '한 구멍에 시선이 고정되면 다음 팝업을 놓치므로 필드를 넓게 보게 하세요.',
    ],
    instruction:
      '필드 구멍에서 두더지가 올라오는지 확인합니다.\n두더지 색을 읽습니다.\n같은 색 패드로 이동합니다.',
    coachScript: '찾고, 색 보고, 바로 이동!',
    focusTags: tags('visualSearch', 'simpleReaction', 'lowerBodyCoordination'),
    easier: '팝업을 손가락으로 가리키게 한 뒤 이동하게 하고, 자극 간격을 늘립니다.',
    harder: '말 없이 팝업→이동만 이어가게 하고, 자극 간격을 줄입니다.',
    successCriteria: '팝업이 나타난 뒤에야 움직이며, 두더지 색과 맞는 패드로 갑니다.',
    commonMistake: '두더지가 뜨기 전에 익숙한 패드로 먼저 이동합니다.',
  },
};

const MOLE_VARIANT: SpomoveVisualReactionGuideSeed = {
  presetId: 'visual-reaction-mole-normal-skeleton',
  cluster: 'mole',
  movementGuide: {
    movement: { baseMovement: 'footTap', limbRule: 'free' },
    objective: '1~2마리 색 두더지 팝업을 확인하고 각 색에 맞는 패드로 반응합니다.',
    teachingPoints: [
      '2마리가 나오면 한 마리에만 시선을 고정하지 않게 하세요.',
      '외형(모자·선글라스 등)보다 색을 먼저 확인하게 하세요.',
      '두 색을 각각 말한 뒤 양쪽으로 반응하게 하면 놓침이 줄어듭니다.',
    ],
    instruction:
      '구멍에서 올라온 두더지 수를 확인합니다.\n각 두더지 색을 읽습니다.\n같은 색 패드로 빠르게 반응합니다.',
    coachScript: '두 개면 두 색! 바로 이동!',
    focusTags: tags('visualSearch', 'choiceReaction', 'lowerBodyCoordination'),
    easier: '1마리만 나온 라운드를 먼저 익히게 하고, 자극 간격을 늘립니다.',
    harder: '2마리 등장 시 말 없이 두 색을 바로 연결하게 하고, 간격을 줄입니다.',
    successCriteria: '1마리·2마리 모두에서 색을 놓치지 않고 맞는 패드로 반응합니다.',
    commonMistake: '2마리 중 한 색만 보고 반대쪽을 놓칩니다.',
  },
};

const HF_EASY: SpomoveVisualReactionGuideSeed = {
  presetId: 'visual-reaction-hand-foot-easy-skeleton',
  cluster: 'hand-foot',
  movementGuide: {
    movement: { baseMovement: 'footTap', limbRule: 'free' },
    objective: '4분할에 나타난 발 자극 1개를 확인하고 표시된 발 동작으로 해당 색 패드를 접촉합니다.',
    teachingPoints: [
      '색 위치를 먼저 확인한 뒤 발 아이콘(왼발/오른발/양발)을 읽게 하세요.',
      '양발 표시인데 한 발만 쓰면 아이콘을 다시 말하게 하세요.',
      '손이 나오면 안 되는 단계이므로 손이 나가면 즉시 멈추게 하세요.',
    ],
    instruction:
      '켜진 색 칸을 확인합니다.\n발 아이콘을 확인합니다.\n표시된 발 동작으로 해당 패드를 접촉합니다.',
    coachScript: '색 먼저, 발로!',
    focusTags: tags('choiceReaction', 'lowerBodyCoordination', 'directionControl'),
    easier: '발 아이콘을 말로 확인한 뒤 접촉하게 하고, 자극 시간을 늘립니다.',
    harder: '말 없이 색→발 동작→접촉만 이어가게 하고, 자극 시간을 줄입니다.',
    successCriteria: '발 자극 1개에서 표시된 발 부위를 바꿔 쓰지 않고 맞는 패드를 접촉합니다.',
    commonMistake: '색만 보고 발 아이콘과 다른 발로 밟습니다.',
  },
};

const HF_NORMAL: SpomoveVisualReactionGuideSeed = {
  presetId: 'visual-reaction-hand-foot-normal-skeleton',
  cluster: 'hand-foot',
  movementGuide: {
    movement: { baseMovement: 'handTouch', limbRule: 'free' },
    objective: '1~2개 손·발 자극을 확인하고 각 색 위치에 표시된 신체 부위로 반응합니다.',
    teachingPoints: [
      '2개일 때 “색-부위”를 한 쌍씩 묶어서 읽게 하세요.',
      '손과 발을 뒤바꾸면 동작을 멈추고 아이콘부터 다시 읽게 하세요.',
      '1개 자극이어도 발이 나오므로, 발이 빠지지 않는지 확인하세요.',
    ],
    instruction:
      '켜진 칸 수를 확인합니다.\n각 칸의 색과 손/발 아이콘을 읽습니다.\n표시된 부위로 해당 패드를 동시에 맞춰 접촉합니다.',
    coachScript: '색과 손발, 나눠서!',
    focusTags: tags('choiceReaction', 'upperLowerCoordination', 'attentionShift'),
    easier: '1개 자극부터 익히게 한 뒤 2개로 올리고, 자극 시간을 늘립니다.',
    harder: '2개 자극에서 말 없이 손발 분리 반응만 이어가게 합니다.',
    successCriteria: '1~2개 자극에서 손·발을 바꾸지 않고 각 색 패드를 맞게 접촉합니다.',
    commonMistake: '2개 자극에서 손과 발을 뒤바꾸거나 한 부위만 반응합니다.',
  },
};

const HF_HARD: SpomoveVisualReactionGuideSeed = {
  presetId: 'visual-reaction-hand-foot-hard-skeleton',
  cluster: 'hand-foot',
  movementGuide: {
    movement: { baseMovement: 'handTouch', limbRule: 'free' },
    objective: '최대 3개 손·발 자극을 동시에 읽고 각 색 위치에 표시된 부위로 반응합니다.',
    teachingPoints: [
      '3개일 때 양발+한 손 또는 한 발+양손 패턴인지 먼저 확인하게 하세요.',
      '하나를 놓치면 “몇 개인지”부터 다시 세게 하세요.',
      '속도보다 부위 매칭 정확도를 먼저 확인한 뒤 자극 시간을 줄입니다.',
    ],
    instruction:
      '켜진 칸이 1~3개인지 확인합니다.\n각 칸의 색과 손/발 아이콘을 읽습니다.\n표시된 부위로 해당 패드를 동시에 맞춰 접촉합니다.',
    coachScript: '세 개면 세 군데! 손발 맞춰!',
    focusTags: tags('choiceReaction', 'upperLowerCoordination', 'attentionShift'),
    easier: '2개 자극이 안정될 때까지 반복한 뒤 3개로 올리고, 자극 시간을 늘립니다.',
    harder: '3개 자극에서 말 없이 동시 접촉만 이어가게 하고, 자극 시간을 줄입니다.',
    successCriteria: '1~3개 자극에서 부위를 바꾸지 않고 모든 표시 패드를 맞게 접촉합니다.',
    commonMistake: '3개 중 하나를 놓치거나 손·발 조합을 뒤바꿉니다.',
  },
};

const GK_EASY: SpomoveVisualReactionGuideSeed = {
  presetId: 'visual-reaction-goalkeeper-easy-skeleton',
  cluster: 'goalkeeper',
  movementGuide: {
    movement: { baseMovement: 'handTouch', limbRule: 'free' },
    objective: '날아오는 공 1개의 궤적을 끝까지 추적해 도착 코너 색 패드로 반응합니다.',
    teachingPoints: [
      '출발 코너만 보고 미리 움직이지 말고 도착까지 추적하게 하세요.',
      '커브가 나와도 최종 도착 코너 색을 기준으로 하게 하세요.',
      '화면이 손/발을 지정하지 않으므로, 별도 손·발 규칙을 쓰면 교사가 먼저 말로 정하세요.',
    ],
    instruction:
      '멀리서 오는 공의 궤적을 눈으로 추적합니다.\n도착 코너의 색을 확인합니다.\n같은 색 패드로 이동합니다.',
    coachScript: '공 끝까지, 도착 색으로!',
    focusTags: tags('visualSearch', 'simpleReaction', 'choiceReaction'),
    easier: '도착 코너를 손가락으로 가리키게 한 뒤 이동하게 하고, 비행 시간을 늘립니다.',
    harder: '말 없이 궤적→도착 색→이동만 이어가게 하고, 비행 시간을 줄입니다.',
    successCriteria: '출발만 보고 미리 가지 않고, 도착 코너 색 패드로 이동합니다.',
    commonMistake: '공의 시작 방향만 보고 커브 도착을 놓칩니다.',
  },
};

const GK_NORMAL: SpomoveVisualReactionGuideSeed = {
  presetId: 'visual-reaction-goalkeeper-42',
  cluster: 'goalkeeper',
  movementGuide: {
    movement: { baseMovement: 'handTouch', limbRule: 'free' },
    objective: '공 1~2개의 궤적을 끝까지 추적해 각 도착 코너 색 패드로 반응합니다.',
    teachingPoints: [
      '두 공이 나오면 한 공만 추적하지 않게 하세요.',
      '커브·더블이 섞여도 최종 도착 코너 색을 기준으로 하게 하세요.',
      '출발 순간에 미리 패드로 가면 멈추고 궤적을 다시 보게 하세요.',
    ],
    instruction:
      '날아오는 공 수를 확인합니다.\n각 공의 궤적을 끝까지 추적합니다.\n도착 코너 색 패드로 이동합니다.',
    coachScript: '두 개면 두 코너! 끝까지!',
    focusTags: tags('visualSearch', 'choiceReaction', 'attentionShift'),
    easier: '한 공 궤적부터 익히게 한 뒤 더블을 받아들이게 하고, 비행 시간을 늘립니다.',
    harder: '더블 샷에서 말 없이 두 코너를 바로 연결하게 하고, 비행 시간을 줄입니다.',
    successCriteria: '1~2개 공 모두 도착 코너 색을 놓치지 않고 반응합니다.',
    commonMistake: '더블 샷에서 한 공만 보고 반대 코너를 놓칩니다.',
  },
};

export const SPOMOVE_VISUAL_REACTION_GUIDE_SEEDS: readonly SpomoveVisualReactionGuideSeed[] = [
  RUSH,
  FLOW,
  FLASH,
  MOLE_CLASSIC,
  MOLE_VARIANT,
  HF_EASY,
  HF_NORMAL,
  HF_HARD,
  GK_EASY,
  GK_NORMAL,
];

export const SPOMOVE_VISUAL_REACTION_SEED_PRESET_IDS = SPOMOVE_VISUAL_REACTION_GUIDE_SEEDS.map(
  (entry) => entry.presetId,
);

export const SPOMOVE_VISUAL_REACTION_NEW_PRESET_IDS = SPOMOVE_VISUAL_REACTION_SEED_PRESET_IDS.filter(
  (id) => id !== 'visual-reaction-flash-33',
);

export function listVisualReactionSeedsByCluster(
  cluster: SpomoveVisualReactionCluster,
): SpomoveVisualReactionGuideSeed[] {
  return SPOMOVE_VISUAL_REACTION_GUIDE_SEEDS.filter((entry) => entry.cluster === cluster);
}
