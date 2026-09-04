import type { SpomoveFocusTag } from './spomoveGuideContract';
import type { SpomoveGuideSeedBase } from './spomoveGuideSeedMerge';

/**
 * Sequential-memory commercial guides.
 * Public runtime must NOT import this as fallback — CMS is SSOT after Admin save.
 */

export type SpomoveSequentialMemoryCluster =
  | 'm1-color-sequence'
  | 'm2-color-number'
  | 'm3-full-reveal';

export type SpomoveSequentialMemoryGuideSeed = SpomoveGuideSeedBase & {
  cluster: SpomoveSequentialMemoryCluster;
};

function tags(...focusTags: SpomoveFocusTag[]): SpomoveFocusTag[] {
  return focusTags.slice(0, 3);
}

/** KEEP pilot — no overwriteGuideFields; merge fills blanks only. */
const COLOR_3: SpomoveSequentialMemoryGuideSeed = {
  presetId: 'sequential-memory-3color-09',
  cluster: 'm1-color-sequence',
  movementGuide: {
    movement: { baseMovement: 'stepHold', limbRule: 'free' },
    objective: '차례로 제시되는 색 3개의 순서를 기억한 뒤, 같은 순서로 패드를 밟아 재현합니다.',
    teachingPoints: [
      '제시가 끝나기 전에 발로 나가지 말고, 제시→기억→재현 순서를 지키게 하세요.',
      '중간 색을 빼먹으면 첫·가운데·끝을 손짓으로 세게 한 뒤 다시 재현하게 하세요.',
      '교사가 순서를 확인하기 전까지는 다음 라운드로 넘어가지 않게 하세요.',
    ],
    instruction:
      '화면에 나오는 색 순서를 끝까지 봅니다.\n제시가 끝나면 같은 순서로 패드를 밟아 재현합니다.\n교사가 순서를 확인한 뒤 다음 라운드로 갑니다.',
    coachScript: '보고, 기억하고, 그대로 밟으세요!',
    focusTags: tags('sequenceMemory', 'attentionShift', 'lowerBodyCoordination'),
    easier: '제시 후 짧은 멈춤을 두고 첫 색부터 천천히 재현하게 합니다.',
    harder: '재현 전 되뇌기를 줄이고 바로 수행하게 합니다.',
    successCriteria: '3색을 제시 순서대로 재현하고, 교사가 순서를 확인할 수 있습니다.',
    commonMistake: '제시가 끝나기 전에 패드로 나가거나, 중간 색을 건너뜁니다.',
  },
};

const COLOR_5: SpomoveSequentialMemoryGuideSeed = {
  presetId: 'sequential-memory-5color-51',
  cluster: 'm1-color-sequence',
  movementGuide: {
    movement: { baseMovement: 'stepHold', limbRule: 'free' },
    objective: '차례로 제시되는 색 5개의 순서를 기억한 뒤, 같은 순서로 패드를 재현합니다.',
    teachingPoints: [
      '5개일수록 중간 항목이 빠지기 쉬우니, 2·3·4번째를 따로 되뇌게 하세요.',
      '재현 중 멈칫하면 처음부터 다시 밟게 하지 말고, 막힌 자리만 짧게 되묻게 하세요.',
      '즉각 쫓기 반응이 아니라 제시→기억→재현→확인 흐름을 유지하세요.',
    ],
    instruction:
      '색 5개가 순서대로 나오는 동안 끝까지 봅니다.\n제시가 끝나면 같은 순서로 패드를 밟아 재현합니다.\n교사가 중간·끝 순서를 확인한 뒤 다음 라운드로 갑니다.',
    coachScript: '다섯 개! 중간도 빠지지 않게!',
    focusTags: tags('sequenceMemory', 'attentionShift', 'lowerBodyCoordination'),
    easier: '제시 후 순서를 한 번 말로 되뇌게 한 뒤 재현을 시작합니다.',
    harder: '말 없이 바로 재현하게 하고, 중간 항목만 교사가 따로 확인합니다.',
    successCriteria: '5색 중 중간 항목을 빠뜨리지 않고 제시 순서대로 재현합니다.',
    commonMistake: '앞·뒤만 맞고 가운데 2~3개를 건너뛰거나 순서를 바꿉니다.',
  },
};

const COLOR_RAMP: SpomoveSequentialMemoryGuideSeed = {
  presetId: 'sequential-memory-10color-52',
  cluster: 'm1-color-sequence',
  movementGuide: {
    movement: { baseMovement: 'stepHold', limbRule: 'free' },
    objective: '5라운드 동안 색 항 수가 3→7개로 늘어나는 순서를 기억한 뒤 같은 순서로 재현합니다.',
    teachingPoints: [
      '라운드마다 항 수가 늘어나므로, “이번엔 몇 개인지”를 먼저 세게 하세요.',
      '앞 라운드 습관으로 짧게 끝내면 늘어난 뒷부분을 놓칩니다. 끝까지 보게 하세요.',
      '교사 확인 전에 스스로 맞았다고 다음으로 넘기지 않게 하세요.',
    ],
    instruction:
      '이번 라운드에 나오는 색 개수를 확인합니다.\n제시가 끝날 때까지 순서를 기억합니다.\n같은 순서로 패드를 재현하고 교사가 확인한 뒤 다음 라운드로 갑니다.',
    coachScript: '이번엔 몇 개? 끝까지 보고 재현!',
    focusTags: tags('sequenceMemory', 'attentionShift', 'lowerBodyCoordination'),
    easier: '3~4개 라운드에서 흐름을 익힌 뒤 5개 이상으로 올립니다.',
    harder: '항 수가 늘어난 라운드에서 되뇌기 없이 바로 재현하게 합니다.',
    successCriteria: '라운드별 항 수 증가를 반영해 끝까지 순서대로 재현합니다.',
    commonMistake: '이전 라운드 길이로 끝내 버리거나, 늘어난 뒷부분을 놓칩니다.',
  },
};

const COLOR_CUSTOM: SpomoveSequentialMemoryGuideSeed = {
  presetId: 'sequential-memory-custom-10color-exp',
  cluster: 'm1-color-sequence',
  movementGuide: {
    movement: { baseMovement: 'stepHold', limbRule: 'free' },
    objective: '4×4 색 그리드를 잠깐 기억한 뒤, 단 한 칸만 바뀐 색을 원샷으로 찾아 해당 색 패드로 반응합니다.',
    teachingPoints: [
      '기억 구간에서는 전체를 한눈에 찍게 하고, 탐색 구간에서만 “바뀐 한 칸”을 찾게 하세요.',
      '원샷은 한 번만 바뀌므로, 바뀐 뒤의 새 색이 정답(패드)임을 분명히 합니다.',
      '정답 공개는 원래 색 → 바뀐 색 순서로 확인합니다.',
    ],
    instruction:
      '그리드 색을 설정한 기억 시간 동안 봅니다.\n한 칸만 색이 바뀌면 3초 안에 그 새 색 패드로 이동합니다.\n정답 공개(원래 색 → 바뀐 색)를 본 뒤 다음 라운드로 갑니다.',
    coachScript: '전체를 찍고, 바뀐 한 칸만!',
    focusTags: tags('sequenceMemory', 'attentionShift', 'individual'),
    easier: '3×3 그리드나 깜빡이 모드로 난이도를 낮춥니다.',
    harder: '5×5 그리드나 원샷 유지로 난이도를 올립니다.',
    successCriteria: '바뀐 칸의 새 색을 찾아 같은 색 패드로 반응합니다.',
    commonMistake: '원래 색 패드로 가거나, 바뀌지 않은 칸에 시선을 고정합니다.',
  },
};

const COLOR_NUMBER: SpomoveSequentialMemoryGuideSeed = {
  presetId: 'sequential-memory-color-number-exp',
  cluster: 'm2-color-number',
  movementGuide: {
    movement: { baseMovement: 'stepHold', limbRule: 'free' },
    objective: '번호와 연결된 색을 제시 단계에서 기억한 뒤, 질문에 맞춰 색·번호를 말하고 교사가 공개해 확인합니다.',
    teachingPoints: [
      '제시 구간에서는 퀴즈에 바로 답하지 말고, 색-번호 쌍을 먼저 외우게 하세요.',
      '답이 나오면 교사가 공개·확인한 뒤에야 맞는지 정리하세요.',
      '패드만 쫓는 반응이 아니라, 연합 기억을 말로 꺼내는지 보세요.',
    ],
    instruction:
      '번호와 색이 짝지어 제시되는 동안 쌍을 기억합니다.\n질문이 나오면 기억한 색 또는 번호를 말합니다.\n교사가 정답을 공개해 확인한 뒤 다음 질문으로 갑니다.',
    coachScript: '색과 번호, 쌍으로 기억! 내가 확인할게!',
    focusTags: tags('sequenceMemory', 'attentionShift', 'individual'),
    easier: '제시 시간을 늘리고, 질문 전에 한 쌍을 함께 되뇌게 합니다.',
    harder: '제시를 짧게 하고, 색→번호·번호→색을 번갈아 묻습니다.',
    successCriteria: '제시된 색-번호 연합을 바탕으로 질문에 답하고 교사 공개로 확인합니다.',
    commonMistake: '제시를 다 보기 전에 추측으로 답하거나, 교사 공개 전에 스스로 넘어갑니다.',
  },
};

const FULL_REVEAL: SpomoveSequentialMemoryGuideSeed = {
  presetId: 'sequential-memory-full-reveal-54',
  cluster: 'm3-full-reveal',
  movementGuide: {
    movement: { baseMovement: 'stepHold', limbRule: 'free' },
    objective: '격자 전체에 공개된 색 순서를 한눈에 기억한 뒤, 같은 순서로 패드를 재현합니다.',
    teachingPoints: [
      '한 칸만 보지 말고 전체 패턴(행·열·덩어리)으로 읽게 하세요.',
      '공개가 사라진 뒤에도 바로 뛰지 말고, 속으로 한 번 훑은 뒤 재현을 시작하세요.',
      '교사와 함께 시작·중간·끝 칸을 대조해 확인합니다.',
    ],
    instruction:
      '화면에 전체 순서가 한 번에 공개되는 동안 격자 전체를 봅니다.\n공개가 끝나면 같은 순서로 패드를 밟아 재현합니다.\n교사가 전체 순서를 확인한 뒤 다음 라운드로 갑니다.',
    coachScript: '한눈에 전체! 기억하고 그대로 재현!',
    focusTags: tags('sequenceMemory', 'visualSearch', 'lowerBodyCoordination'),
    easier: '공개 시간을 늘리고, 재현 전 행 단위로 되뇌게 합니다.',
    harder: '공개 시간을 줄이고, 되뇌기 없이 바로 재현하게 합니다.',
    successCriteria: '전체 공개 패턴을 반영해 순서대로 재현하고 교사 확인을 받습니다.',
    commonMistake: '일부 칸만 보고 나머지를 추측하거나, 한 줄만 재현하고 끝냅니다.',
  },
};

export const SPOMOVE_SEQUENTIAL_MEMORY_GUIDE_SEEDS: readonly SpomoveSequentialMemoryGuideSeed[] = [
  COLOR_3,
  COLOR_5,
  COLOR_RAMP,
  COLOR_CUSTOM,
  COLOR_NUMBER,
  FULL_REVEAL,
];

export const SPOMOVE_SEQUENTIAL_MEMORY_SEED_PRESET_IDS = SPOMOVE_SEQUENTIAL_MEMORY_GUIDE_SEEDS.map(
  (entry) => entry.presetId,
);

export function listSequentialMemorySeedsByCluster(
  cluster: SpomoveSequentialMemoryCluster,
): SpomoveSequentialMemoryGuideSeed[] {
  return SPOMOVE_SEQUENTIAL_MEMORY_GUIDE_SEEDS.filter((entry) => entry.cluster === cluster);
}
