import type { SpomoveMovementGuideDraft } from './spomoveGuideContract';
import type { SpomovePresetContentOverride } from './spomoveOfficialAssets';

/**
 * SPOMOVE Editorial Pilot seed (7 program groups).
 *
 * Role after SPOMOVE-PILOT-CMS-LIVE-03:
 * - test fixture + admin-only CMS apply helper input
 * - NOT a Public runtime fallback (must never be imported from Hub/Sheet/session)
 *
 * Live content SSOT is think_asset_packs via Admin save path.
 */
export const SPOMOVE_EDITORIAL_PILOT_PRESET_IDS = [
  'reaction-cognition-space-direction-01',
  'visual-reaction-flash-33',
  'simon-pole-arrows-41',
  'flanker-uniform-07',
  'stroop-arrow-bg-47',
  'sequential-memory-3color-09',
  'dive-standard',
] as const;

export type SpomoveEditorialPilotPresetId = (typeof SPOMOVE_EDITORIAL_PILOT_PRESET_IDS)[number];

export type SpomoveEditorialPilotEntry = {
  presetId: SpomoveEditorialPilotPresetId;
  programGroup:
    | 'reaction-cognition'
    | 'visual-reaction'
    | 'simon'
    | 'flanker'
    | 'stroop'
    | 'sequential-memory'
    | 'dive';
  rationale: string;
  movementGuide: SpomoveMovementGuideDraft;
};

export const SPOMOVE_EDITORIAL_PILOT_CONTENT: readonly SpomoveEditorialPilotEntry[] = [
  {
    presetId: 'reaction-cognition-space-direction-01',
    programGroup: 'reaction-cognition',
    rationale: '중앙 화살표 → 해당 방향 패드로 이동하는 기본 stimulus→movement 연결.',
    movementGuide: {
      movement: { baseMovement: 'footTap', limbRule: 'free' },
      objective: '화면에 제시되는 방향을 빠르게 구분하고 해당 위치 패드로 정확하게 이동합니다.',
      teachingPoints: [
        '속도보다 방향 선택의 정확성을 먼저 확인하세요.',
        '반대 방향으로 반복 이동하면 화살표를 손가락으로 짧게 가리킨 뒤 다시 몸으로 수행하게 하세요.',
      ],
      instruction:
        '중앙 화살표 방향을 확인합니다.\n화살표가 가리키는 색 패드로 이동합니다.\n다음 신호가 나올 때까지 자리를 유지합니다.',
      coachScript: '화살표를 먼저 보고, 그 방향으로 이동하세요.',
      focusTags: ['choiceReaction', 'directionControl', 'lowerBodyCoordination'],
      easier: '자극 시간을 늘리고 한 방향씩 천천히 확인한 뒤 이동합니다.',
      harder: '자극 시간을 줄이고 이동 후 중앙으로 빠르게 복귀합니다.',
    },
  },
  {
    presetId: 'visual-reaction-flash-33',
    programGroup: 'visual-reaction',
    rationale: '낙하 풍선이 하단 가시에 닿는 타이밍에 색 반응 — FLOW/Mole과 다른 추적·타이밍 mechanics.',
    movementGuide: {
      movement: { baseMovement: 'handTouch', limbRule: 'free' },
      objective: '떨어지는 색 풍선이 가시에 닿는 순간을 포착해 같은 색으로 즉시 반응합니다.',
      teachingPoints: [
        '풍선이 떠 있을 때가 아니라 가시에 닿는 순간을 기준으로 반응하는지 확인하세요.',
        '색을 늦게 고르면 다음 낙하와 겹치므로, 한 번에 한 풍선만 추적하게 하세요.',
      ],
      instruction:
        '떨어지는 색 풍선을 눈으로 추적합니다.\n풍선이 하단 가시에 닿을 때 같은 색으로 반응합니다.\n연속으로 이어지는 낙하에 맞춰 다음 풍선으로 시선을 옮깁니다.',
      coachScript: '가시에 닿을 때! 같은 색으로 반응하세요.',
      focusTags: ['visualSearch', 'simpleReaction', 'upperLowerCoordination'],
      easier: '풍선 수를 줄이거나 낙하 속도를 낮춘 설정으로 시작합니다.',
      harder: '시선이 한곳에 머무르지 않게 하고 연속 낙하에 맞춰 반응 간격을 줄입니다.',
    },
  },
  {
    presetId: 'simon-pole-arrows-41',
    programGroup: 'simon',
    rationale: '극단 화살표의 위치가 아니라 화살표 방향으로 반응하는 choice/inhibition (REFINE).',
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
      focusTags: ['responseInhibition', 'directionControl', 'choiceReaction'],
      easier: '방향을 짧게 말한 뒤 이동하게 하고, 자극 시간을 늘립니다.',
      harder: '말 없이 방향→이동만 이어가게 하고, 위치-방향 충돌을 더 자주 확인합니다.',
      successCriteria: '화살표 위치에 끌려가지 않고 방향 패드로 이동합니다.',
      commonMistake: '화살표가 나타난 위치로 가거나, 색 패드로 잘못 반응합니다.',
    },
  },
  {
    presetId: 'flanker-uniform-07',
    programGroup: 'flanker',
    rationale: '좌우 화살표 플랭커에서 가운데 화살표 방향만 선택 (canonical L5 lr, REFINE).',
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
      focusTags: ['responseInhibition', 'directionControl', 'choiceReaction'],
      easier: '주변과 가운데가 같은 자극부터 가운데 시선을 고정합니다.',
      harder: '주변과 가운데가 다른 자극 비중을 높이고 자극 시간을 줄입니다.',
      successCriteria: '주변 화살표를 따라가지 않고 가운데 방향 패드로 이동합니다.',
      commonMistake: '양쪽 방해 화살표 방향으로 먼저 발이 나갑니다.',
    },
  },
  {
    presetId: 'stroop-arrow-bg-47',
    programGroup: 'stroop',
    rationale: '런타임 L2 단어 스트룹: 의미/잉크 ± 역전을 음성으로 답 (REFINE, arrow+bg 아님).',
    movementGuide: {
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
      focusTags: ['ruleSwitching', 'responseInhibition', 'attentionShift'],
      easier: '의미만 또는 잉크만 구간을 먼저 익힌 뒤 교차·역전을 넣습니다.',
      harder: '교차·역전 비중을 높이고, 말하기 전 망설임을 줄이게 합니다.',
      successCriteria: '의미/잉크·정/역 규칙을 바꿔가며 말로 답하고 교사가 확인합니다.',
      commonMistake: '이전 규칙에 남아 있거나, 의미와 잉크를 바꿔 말합니다.',
    },
  },
  {
    presetId: 'sequential-memory-3color-09',
    programGroup: 'sequential-memory',
    rationale: '3색 제시 순서 인지 → 유지 → 몸으로 재현하는 기본 순차 기억.',
    movementGuide: {
      movement: { baseMovement: 'stepHold', limbRule: 'free' },
      objective: '차례로 제시되는 색 3개의 순서를 기억한 뒤 같은 순서로 패드를 재현합니다.',
      teachingPoints: [
        '제시가 끝나면 바로 움직이지 말고, 순서를 한 번 속으로 되뇌게 한 뒤 재현을 시작하세요.',
        '중간 색을 빼먹는 경우 첫·가운데·끝을 손짓으로 세게 한 뒤 다시 수행하게 하세요.',
      ],
      instruction:
        '화면에 나오는 색 순서를 끝까지 봅니다.\n제시가 끝나면 같은 순서로 패드를 밟아 재현합니다.\n순서가 틀리면 다음 라운드에서 제시부터 다시 집중합니다.',
      coachScript: '순서대로! 보고, 기억하고, 그대로 밟으세요.',
      focusTags: ['sequenceMemory', 'attentionShift', 'lowerBodyCoordination'],
      easier: '제시 후 짧은 멈춤을 두고 첫 색부터 천천히 재현하게 합니다.',
      harder: '재현 전 되뇌기를 줄이고 바로 수행하게 해 작업기억 부하를 높입니다.',
    },
  },
  {
    presetId: 'dive-standard',
    programGroup: 'dive',
    rationale: '화면이 손·발·숙이기 등 동작을 직접 안내하는 diveBuiltIn 순차 스테이지.',
    movementGuide: {
      movement: null,
      objective: '화면이 안내하는 점프·펀치·킥·숙이기·벽 닿기 동작을 순서대로 전환하며 수행합니다.',
      teachingPoints: [
        '다음 동작 아이콘이 보이면 이전 동작을 끊고 공간(제자리/전방)을 먼저 잡게 하세요.',
        '센서 판정이 없으므로 “맞았는지”보다 동작 형태와 전환 타이밍을 눈으로 확인하세요.',
      ],
      instruction:
        '화면에 나오는 동작 안내를 확인합니다.\n안내된 동작을 매트 공간에서 수행합니다.\n스테이지가 바뀌면 다음 동작으로 바로 전환합니다.',
      coachScript: '화면이 알려주는 동작으로! 다음 동작 준비!',
      focusTags: ['movementCoordination', 'attentionShift', 'individual'],
      easier: '한 동작씩 멈춤을 두고 형태를 확인한 뒤 다음 스테이지로 진행합니다.',
      harder: '동작 전환 간격을 줄이고 연속 흐름을 유지하게 합니다.',
    },
  },
];

function isBlankGuideValue(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (typeof value === 'string') return !value.trim();
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

/**
 * Merge pilot guide into an existing override.
 * Existing non-blank fields win. Pilot only fills blanks (objective/teachingPoints first).
 * Never bulk-replaces an entire published guide object.
 */
export function mergeSpomoveEditorialPilotOverride(
  current: SpomovePresetContentOverride | undefined,
  pilot: SpomoveEditorialPilotEntry,
): SpomovePresetContentOverride {
  const existingGuide = current?.movementGuide ?? {};
  const mergedGuide: SpomoveMovementGuideDraft = { ...existingGuide };

  for (const [key, value] of Object.entries(pilot.movementGuide) as Array<
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

export function buildSpomoveEditorialPilotContentMap(
  current: Record<string, SpomovePresetContentOverride | undefined> = {},
): Record<string, SpomovePresetContentOverride> {
  const next: Record<string, SpomovePresetContentOverride> = { ...current } as Record<
    string,
    SpomovePresetContentOverride
  >;
  for (const pilot of SPOMOVE_EDITORIAL_PILOT_CONTENT) {
    next[pilot.presetId] = mergeSpomoveEditorialPilotOverride(current[pilot.presetId], pilot);
  }
  return next;
}
