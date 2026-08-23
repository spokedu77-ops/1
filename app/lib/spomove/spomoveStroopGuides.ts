import type { SpomoveFocusTag } from './spomoveGuideContract';
import type { SpomoveGuideSeedBase } from './spomoveGuideSeedMerge';

/**
 * Stroop commercial guides (runtime-accurate).
 * Public runtime must NOT import this as fallback — CMS is SSOT after Admin save.
 */

export type SpomoveStroopCluster = 'l1-pad' | 'l2-word-voice' | 'l3-word-voice' | 'l4-word-bg-voice';

export type SpomoveStroopGuideSeed = SpomoveGuideSeedBase & {
  cluster: SpomoveStroopCluster;
};

function tags(...focusTags: SpomoveFocusTag[]): SpomoveFocusTag[] {
  return focusTags.slice(0, 3);
}

/** L1 — compass color arrows → direction pad move. */
const L1_PAD: SpomoveStroopGuideSeed = {
  presetId: 'stroop-arrow-reverse-08',
  cluster: 'l1-pad',
  movementGuide: {
    movement: { baseMovement: 'footTap', limbRule: 'free' },
    objective: '방향별 색이 채워진 화살표(위빨·좌초·우노·하파)를 보고, 화살표가 가리키는 방향 패드로 이동합니다.',
    teachingPoints: [
      '화살표 안 색보다 가리키는 방향을 먼저 확인하게 하세요. 색은 나침반 단서입니다.',
      '반대 방향으로 반복 이동하면 화살표를 손가락으로 짧게 가리킨 뒤 다시 이동하게 하세요.',
      '패드 이동이 답입니다. 말로만 끝내지 않게 하세요.',
    ],
    instruction:
      '중앙 색 화살표의 방향을 확인합니다.\n화살표가 가리키는 방향 패드로 이동합니다.\n위빨·좌초·우노·하파 매핑은 방향을 돕는 단서입니다.',
    coachScript: '색 단서 보고, 방향 패드로!',
    focusTags: tags('choiceReaction', 'directionControl', 'lowerBodyCoordination'),
    easier: '방향을 짧게 말한 뒤 이동하게 하고, 자극 시간을 늘립니다.',
    harder: '자극 시간을 줄이고, 색을 말하지 않고 방향만으로 이동하게 합니다.',
    successCriteria: '나침반 색 단서를 쓰되, 최종적으로 화살표 방향 패드로 이동합니다.',
    commonMistake: '화살표 안 색과 같은 패드로 가거나, 반대 방향으로 이동합니다.',
  },
};

/**
 * REFINE pilot — runtime L2 word meaning/ink ± reverse (voice).
 * Do not describe as arrow+background.
 */
const L2_WORD: SpomoveStroopGuideSeed = {
  presetId: 'stroop-arrow-bg-47',
  cluster: 'l2-word-voice',
  overwriteGuideFields: true,
  movementGuide: {
    // Voice-primary; pad move optional — builtIn null not allowed on stroop family.
    movement: { baseMovement: 'handTouch', limbRule: 'free' },
    objective: '검정 배경에 나온 색 단어에서, 라운드 규칙에 따라 단어 의미 또는 글자 색(잉크)을 말하고, 규칙이 뒤집히면 반대로 말합니다.',
    teachingPoints: [
      '이번 자극이 “의미”인지 “잉크”인지, 그리고 정방향인지 역방향인지 먼저 확인하게 하세요.',
      '글자 색에 끌려 의미를 말하거나, 단어에 끌려 잉크를 놓치면 규칙을 다시 콜하세요.',
      '정답은 음성입니다. 교사가 듣고 확인합니다.',
    ],
    instruction:
      '화면에 나온 색 단어를 봅니다.\n이번 규칙이 단어 의미인지 글자 색(잉크)인지 확인합니다.\n규칙이 역전이면 반대로 말해 교사가 확인하게 합니다.',
    coachScript: '의미야, 잉크야? 규칙대로 말해!',
    focusTags: tags('ruleSwitching', 'responseInhibition', 'attentionShift'),
    easier: '의미만 또는 잉크만 구간을 먼저 익힌 뒤 교차·역전을 넣습니다.',
    harder: '교차·역전 비중을 높이고, 말하기 전 망설임을 줄이게 합니다.',
    successCriteria: '의미/잉크·정/역 규칙을 바꿔가며 말로 답하고 교사가 확인합니다.',
    commonMistake: '이전 규칙에 남아 있거나, 의미와 잉크를 바꿔 말합니다.',
  },
};

/** L3 — same word meaning/ink reverse family; slightly harder pacing/load. */
const L3_WORD: SpomoveStroopGuideSeed = {
  presetId: 'stroop-word-reverse-48',
  cluster: 'l3-word-voice',
  movementGuide: {
    movement: { baseMovement: 'handTouch', limbRule: 'free' },
    objective: '검정 배경 색 단어에서 의미·잉크 규칙과 역전을 더 빠르게 전환하며, 규칙에 맞는 답을 말로 합니다.',
    teachingPoints: [
      'L2와 같은 가족이지만, 전환이 잦아지면 “지금 규칙”을 매 자극마다 짧게 되묻게 하세요.',
      '말이 꼬이면 동작을 추가하지 말고, 규칙부터 다시 말하게 하세요.',
      '교사가 음성 답을 확인합니다.',
    ],
    instruction:
      '검정 배경의 색 단어를 봅니다.\n의미 또는 잉크 규칙과 정/역 여부를 확인합니다.\n규칙에 맞는 색 이름을 말해 교사가 확인하게 합니다.',
    coachScript: '규칙 전환! 지금 답만 말해!',
    focusTags: tags('ruleSwitching', 'responseInhibition', 'attentionShift'),
    easier: '정방향만 안정된 뒤 역전을 넣고, 자극 시간을 늘립니다.',
    harder: '의미↔잉크·정↔역 전환을 더 자주 받아들이게 합니다.',
    successCriteria: '규칙 전환이 잦아도 맞는 답을 말로 이어가고 교사 확인을 받습니다.',
    commonMistake: '전환 직후 이전 규칙으로 답하거나, 추측으로 빨리 말해 버립니다.',
  },
};

/** L4 — say ink color; ignore word meaning and background. */
const L4_WORD_BG: SpomoveStroopGuideSeed = {
  presetId: 'stroop-word-bg-49',
  cluster: 'l4-word-bg-voice',
  movementGuide: {
    movement: { baseMovement: 'handTouch', limbRule: 'free' },
    objective: '단어 의미와 배경색 방해가 있을 때, 글자 색(잉크)만 말해 답합니다.',
    teachingPoints: [
      '단어가 가리키는 색·배경색은 무시하고, 글자가 칠해진 색만 말하게 하세요.',
      '배경이 강렬하면 한 박자 멈춘 뒤 “잉크”를 다시 콜하세요.',
      '정답은 음성입니다. 교사가 듣고 확인합니다.',
    ],
    instruction:
      '색 단어와 배경색을 함께 봅니다.\n단어 의미와 배경은 무시합니다.\n글자 색(잉크)만 말해 교사가 확인하게 합니다.',
    coachScript: '단어·배경 말고! 잉크 색만!',
    focusTags: tags('responseInhibition', 'ruleSwitching', 'attentionShift'),
    easier: '배경과 잉크 대비가 약한 자극부터 잉크만 말하게 합니다.',
    harder: '단어·배경·잉크가 모두 다른 자극 비중을 높입니다.',
    successCriteria: '단어 의미와 배경을 무시하고 잉크 색만 말로 답합니다.',
    commonMistake: '단어 의미나 배경색을 잉크 대신 말합니다.',
  },
};

export const SPOMOVE_STROOP_GUIDE_SEEDS: readonly SpomoveStroopGuideSeed[] = [
  L1_PAD,
  L2_WORD,
  L3_WORD,
  L4_WORD_BG,
];

export const SPOMOVE_STROOP_SEED_PRESET_IDS = SPOMOVE_STROOP_GUIDE_SEEDS.map((entry) => entry.presetId);

export function listStroopSeedsByCluster(cluster: SpomoveStroopCluster): SpomoveStroopGuideSeed[] {
  return SPOMOVE_STROOP_GUIDE_SEEDS.filter((entry) => entry.cluster === cluster);
}
