import type { SpomoveFocusTag } from './spomoveGuideContract';
import type { SpomoveGuideSeedBase } from './spomoveGuideSeedMerge';

/**
 * DIVE commercial guides.
 * Public runtime must NOT import this as fallback — CMS is SSOT after Admin save.
 */

export type SpomoveDiveCluster = 'standard' | 'color-gate' | 'beat-rush';

export type SpomoveDiveGuideSeed = SpomoveGuideSeedBase & {
  cluster: SpomoveDiveCluster;
};

function tags(...focusTags: SpomoveFocusTag[]): SpomoveFocusTag[] {
  return focusTags.slice(0, 3);
}

/** KEEP style — screen cues movement; no overwriteGuideFields. */
const STANDARD: SpomoveDiveGuideSeed = {
  presetId: 'dive-standard',
  cluster: 'standard',
  movementGuide: {
    movement: null,
    objective: '화면이 안내하는 점프·펀치·킥·숙이기·벽 닿기 동작을 순서대로 전환하며 수행합니다.',
    teachingPoints: [
      '다음 동작 아이콘이 보이면 이전 동작을 끊고 공간(제자리/전방)을 먼저 잡게 하세요.',
      '맞았는지보다 동작 형태와 전환 타이밍을 교사가 눈으로 확인하세요.',
      '스테이지가 바뀌면 멈추지 말고 다음 동작 준비 자세로 바로 넘어가게 하세요.',
    ],
    instruction:
      '화면에 나오는 동작 안내를 확인합니다.\n안내된 동작을 매트 공간에서 수행합니다.\n스테이지가 바뀌면 다음 동작으로 바로 전환합니다.',
    coachScript: '화면이 알려주는 동작으로! 다음 동작 준비!',
    focusTags: tags('movementCoordination', 'attentionShift', 'individual'),
    easier: '한 동작씩 멈춤을 두고 형태를 확인한 뒤 다음 스테이지로 진행합니다.',
    harder: '동작 전환 간격을 줄이고 연속 흐름을 유지하게 합니다.',
    successCriteria: '안내된 동작을 순서대로 전환하며, 교사가 형태·타이밍을 확인할 수 있습니다.',
    commonMistake: '이전 동작에 남아 다음 스테이지 전환이 늦거나, 동작 형태가 흐려집니다.',
  },
};

const COLOR_GATE: SpomoveDiveGuideSeed = {
  presetId: 'dive-color-gate-61',
  cluster: 'color-gate',
  movementGuide: {
    movement: null,
    objective: '색 관문(빨·노·초·파)과 함께 제시되는 포즈를 읽고, 기본 DIVE 순차 장애물과 구분된 모션 게이트를 수행합니다.',
    teachingPoints: [
      '기본 펀치·킥 스테이지가 아니라, 색 관문 + 포즈 조합인지 먼저 확인하게 하세요.',
      '색만 보고 포즈를 빼먹거나, 포즈만 하고 색을 무시하면 둘 다 다시 읽게 하세요.',
      '교사가 색 선택과 포즈 형태를 눈으로 확인합니다.',
    ],
    instruction:
      '화면에 나온 관문 색을 확인합니다.\n함께 제시된 포즈(점프·킥·사이드 스쿼트·런지 리치·스타 등)를 읽습니다.\n색과 포즈를 맞춰 수행한 뒤 다음 게이트로 전환합니다.',
    coachScript: '색 관문 보고, 포즈까지!',
    focusTags: tags('choiceReaction', 'movementCoordination', 'attentionShift'),
    easier: '색을 말한 뒤 포즈를 하나씩 확인하게 하고, 전환을 천천히 합니다.',
    harder: '말 없이 색+포즈를 바로 연결하고 전환 간격을 줄입니다.',
    successCriteria: '색 관문과 포즈를 함께 맞춰 수행하고, 기본 순차 DIVE와 규칙을 혼동하지 않습니다.',
    commonMistake: '기본 펀치·킥 흐름으로 착각하거나, 색·포즈 중 하나만 수행합니다.',
  },
};

const BEAT_RUSH: SpomoveDiveGuideSeed = {
  presetId: 'dive-beat-rush',
  cluster: 'beat-rush',
  movementGuide: {
    movement: null,
    objective: '블럭의 색과 도착 시점을 확인하고 같은 색 매트로 이동합니다.',
    teachingPoints: [
      '기본 2×2 매트에서 색의 위치를 먼저 익힙니다. 화면 레인의 순서대로 매트를 재배치하지 않습니다.',
      '블럭 앞면이 도착선에 닿는 순간에 이동하고 긴 블럭 동안 같은 자리에서 잔발 스텝을 이어 갑니다.',
      '화면 기록은 제시한 블럭 수입니다. 실제 움직임의 정확도와 안전한 이동은 교사가 확인합니다.',
    ],
    instruction: '다가오는 블럭의 색을 확인합니다.\n블럭 앞면이 도착선에 닿으면 같은 색 매트로 이동합니다.\n긴 블럭이 지나가는 동안 같은 자리에서 가볍게 잔발 스텝을 이어 갑니다.',
    coachScript: '색 먼저 확인! 선에 닿으면 이동! 긴 블럭은 그 자리에서 가볍게!',
    focusTags: tags('choiceReaction', 'movementCoordination', 'attentionShift'),
    easier: '접근 시간을 길게 설정하고 걸어서 색과 위치를 연결합니다.',
    harder: '안전한 이동이 유지되는 범위에서 접근 시간을 줄입니다.',
    successCriteria: '교사가 색 선택, 도착 시점과 이동 자세를 확인합니다.',
    commonMistake: '블럭이 도착하기 전에 움직이거나 화면 레인 순서와 실제 매트 위치를 혼동합니다.',
  },
};

export const SPOMOVE_DIVE_GUIDE_SEEDS: readonly SpomoveDiveGuideSeed[] = [STANDARD, COLOR_GATE, BEAT_RUSH];

export const SPOMOVE_DIVE_SEED_PRESET_IDS = SPOMOVE_DIVE_GUIDE_SEEDS.map((entry) => entry.presetId);

export function listDiveSeedsByCluster(cluster: SpomoveDiveCluster): SpomoveDiveGuideSeed[] {
  return SPOMOVE_DIVE_GUIDE_SEEDS.filter((entry) => entry.cluster === cluster);
}
