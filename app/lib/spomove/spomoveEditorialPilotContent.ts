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
    rationale: '화살표 위치 간섭을 무시하고 화살표 색 규칙으로 반응하는 choice/inhibition.',
    movementGuide: {
      movement: { baseMovement: 'footTap', limbRule: 'free' },
      objective: '화살표가 나타난 위치가 아니라 화살표 색 규칙에 맞춰 올바른 패드로 반응합니다.',
      teachingPoints: [
        '위치가 끌어당기는 자동 반응을 줄이고, 색을 말한 뒤 이동하게 하세요.',
        '불일치 자극에서 틀린 쪽으로 발이 먼저 나가면 한 박자 멈춘 뒤 다시 고르게 하세요.',
      ],
      instruction:
        '화살표의 위치가 아닌 색을 확인합니다.\n색 규칙에 맞는 패드로 이동합니다.\n위치와 색이 어긋난 자극에서도 색 규칙을 유지합니다.',
      coachScript: '위치 말고 색! 색을 보고 이동하세요.',
      focusTags: ['responseInhibition', 'choiceReaction', 'attentionShift'],
      easier: '일치 자극 비중을 높여 색 규칙을 먼저 익히게 합니다.',
      harder: '불일치 자극 비중을 높이고 반응 전 색을 짧게 말하게 합니다.',
    },
  },
  {
    presetId: 'flanker-uniform-07',
    programGroup: 'flanker',
    rationale: '가로 다섯 자극 중 가운데 target만 선택하고 주변 distractor를 억제.',
    movementGuide: {
      movement: { baseMovement: 'footTap', limbRule: 'free' },
      objective: '가로로 늘어선 자극 중 가운데 목표 색만 골라 해당 패드로 이동합니다.',
      teachingPoints: [
        '양쪽 방해 색을 보지 말고 가운데만 손가락으로 짧게 가리키게 한 뒤 이동하게 하세요.',
        '주변과 가운데가 같을 때도 “가운데”를 말로 확인하게 해 습관적 옆보기 반응을 줄이세요.',
      ],
      instruction:
        '화면 가운데 목표 색을 확인합니다.\n주변 색은 무시하고 가운데 색 패드로 이동합니다.\n다음 자극이 나오면 다시 가운데부터 봅니다.',
      coachScript: '가운데만 보세요. 가운데 색으로 이동!',
      focusTags: ['responseInhibition', 'attentionShift', 'choiceReaction'],
      easier: '주변과 가운데가 같은 자극부터 시작해 가운데 시선을 고정합니다.',
      harder: '주변과 가운데가 다른 자극 비중을 높이고 자극 시간을 줄입니다.',
    },
  },
  {
    presetId: 'stroop-arrow-bg-47',
    programGroup: 'stroop',
    rationale: '배경색과 화살표 방향이 충돌할 때 화살표 규칙을 유지하는 전형적 Stroop conflict.',
    movementGuide: {
      movement: { baseMovement: 'handTouch', limbRule: 'free' },
      objective: '배경 색에 끌려가지 않고 화살표 방향 규칙에 따라 올바른 패드로 반응합니다.',
      teachingPoints: [
        '배경색을 먼저 말하면 규칙이 무너지므로, “화살표 방향”만 말하게 하세요.',
        '배경과 방향이 충돌할 때 손이 배경 색으로 가면 동작을 멈추고 화살표를 다시 읽게 하세요.',
      ],
      instruction:
        '화살표 방향을 확인합니다.\n배경 색은 무시하고 방향 규칙에 맞는 패드로 반응합니다.\n색과 방향이 충돌해도 화살표 규칙을 유지합니다.',
      coachScript: '배경 말고 화살표! 방향대로 이동하세요.',
      focusTags: ['responseInhibition', 'ruleSwitching', 'choiceReaction'],
      easier: '배경과 방향이 일치하는 자극부터 규칙을 익히게 합니다.',
      harder: '충돌 자극 비중을 높이고 반응 전 “방향”을 짧게 말하게 합니다.',
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
