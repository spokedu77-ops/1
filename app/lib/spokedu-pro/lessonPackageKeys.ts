/**
 * 수업안 고도화를 위한 패키지 키 상수와 기본 문구.
 * CSV import/export와 연결되므로 key id는 변경하지 않는다.
 */

export type LessonPackageKeyId =
  | 'kindergarten_focus'
  | 'elementary_agility'
  | 'no_equipment'
  | 'small_space'
  | 'open_class'
  | 'new_student'
  | 'teamwork'
  | 'warmup'
  | 'cooldown'
  | 'spomove_linked';

export const LESSON_PACKAGE_KEY_LABELS: Record<LessonPackageKeyId, string> = {
  kindergarten_focus: '유치부 집중 유도',
  elementary_agility: '초등부 순발력',
  no_equipment: '준비물 없는 수업',
  small_space: '좁은 공간 수업',
  open_class: '공개수업',
  new_student: '신규 학생 적응',
  teamwork: '팀워크·협동',
  warmup: '워밍업',
  cooldown: '마무리 활동',
  spomove_linked: 'SPOMOVE 연계',
};

export const LESSON_PACKAGE_DASHBOARD_PRIORITY: LessonPackageKeyId[] = [
  'kindergarten_focus',
  'elementary_agility',
  'no_equipment',
  'open_class',
  'warmup',
  'spomove_linked',
];

export const LESSON_PACKAGE_KEY_ORDER: LessonPackageKeyId[] = [
  'kindergarten_focus',
  'elementary_agility',
  'no_equipment',
  'small_space',
  'open_class',
  'new_student',
  'teamwork',
  'warmup',
  'cooldown',
  'spomove_linked',
];

export const LESSON_PACKAGE_KEY_OPTIONS: { id: LessonPackageKeyId; label: string }[] = LESSON_PACKAGE_KEY_ORDER.map(
  (id) => ({ id, label: LESSON_PACKAGE_KEY_LABELS[id] })
);

export function isLessonPackageKeyId(value: string): value is LessonPackageKeyId {
  return value in LESSON_PACKAGE_KEY_LABELS;
}

export function normalizePackageKeysFromDb(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).map((item) => item.trim());
}

export function parseLessonPackageKeysFromCsvCell(cell: string): string[] {
  return cell
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function serializeLessonPackageKeysForCsv(keys: string[]): string {
  return keys.join(',');
}

export type LessonPackageDetailTemplate = {
  objective?: string;
  safetyNotes?: string[];
  parentNote?: string;
};

export const LESSON_PACKAGE_DETAIL_TEMPLATES: Partial<Record<LessonPackageKeyId, LessonPackageDetailTemplate>> = {
  kindergarten_focus: {
    objective: '주의 집중, 규칙 이해, 신체 반응을 자연스럽게 이끌어냅니다.',
    safetyNotes: [
      '속도보다 규칙 이해와 안전한 이동을 우선합니다.',
      '아이들이 충돌하지 않도록 간격과 이동 방향을 먼저 확인합니다.',
    ],
    parentNote: '오늘 활동은 아이들이 규칙을 이해하고 신호에 맞춰 몸을 조절하는 경험을 쌓는 수업입니다.',
  },
  elementary_agility: {
    objective: '순발력, 방향 전환, 민첩한 반응을 함께 기릅니다.',
    safetyNotes: [
      '방향 전환 구간에서 이동 동선이 겹치지 않도록 안내합니다.',
      '경쟁보다 정확한 반응과 안전한 움직임을 강조합니다.',
    ],
    parentNote: '오늘 활동은 빠른 판단과 민첩한 움직임을 함께 경험하도록 구성한 수업입니다.',
  },
  no_equipment: {
    objective: '별도 준비물 없이 신체 조절, 반응, 협동을 경험합니다.',
    safetyNotes: ['공간 경계를 먼저 정하고 활동 범위를 명확히 안내합니다.'],
    parentNote: '오늘 활동은 특별한 교구 없이도 몸을 조절하고 친구들과 함께 움직이는 경험을 쌓는 수업입니다.',
  },
  small_space: {
    objective: '좁은 공간에서도 안전하게 집중, 반응, 균형 활동을 진행합니다.',
    safetyNotes: [
      '이동 반경을 작게 설정하고 방향 전환 속도를 조절합니다.',
      '벽, 책상, 의자 등 주변 장애물을 먼저 확인합니다.',
    ],
    parentNote: '오늘 활동은 제한된 공간에서도 안전하게 몸을 움직이며 집중력을 기르는 수업입니다.',
  },
  open_class: {
    objective: '참여도, 성장감, 협동 경험을 보호자가 쉽게 관찰할 수 있게 구성합니다.',
    safetyNotes: ['모든 아이가 성공 경험을 느낄 수 있도록 난이도와 대기 시간을 조절합니다.'],
    parentNote: '오늘 활동은 아이들이 즐겁게 움직이면서 협동과 도전 경험을 보여주는 수업입니다.',
  },
  new_student: {
    objective: '새로운 학생이 규칙과 분위기에 편안하게 적응하도록 돕습니다.',
    safetyNotes: [
      '처음에는 관찰과 쉬운 역할 참여를 허용합니다.',
      '활동 규칙을 짧고 분명하게 반복 안내합니다.',
    ],
    parentNote: '오늘 활동은 새로운 환경에 익숙해지고 친구들과 함께 참여하는 경험을 만드는 수업입니다.',
  },
  teamwork: {
    objective: '역할 나누기, 순서 기다리기, 함께 성공하기를 경험합니다.',
    safetyNotes: [
      '팀 간 경쟁보다 역할 수행과 협력 태도를 먼저 칭찬합니다.',
      '기다리는 학생도 관찰 역할이나 응원 역할을 갖도록 안내합니다.',
    ],
    parentNote: '오늘 활동은 친구들과 의견을 맞추고 함께 성공하는 경험을 기르는 수업입니다.',
  },
  warmup: {
    objective: '본 활동 전 몸을 깨우고 집중 상태를 부드럽게 끌어올립니다.',
    safetyNotes: ['관절과 호흡을 천천히 준비하고 갑작스러운 전력 질주는 피합니다.'],
    parentNote: '오늘 준비 활동은 몸과 마음을 수업에 맞게 열어 주는 과정입니다.',
  },
  cooldown: {
    objective: '활동 후 호흡과 몸의 긴장을 낮추고 수업을 차분히 마무리합니다.',
    safetyNotes: ['정리 운동은 천천히 진행하고 과도한 스트레칭을 피합니다.'],
    parentNote: '오늘 마무리 활동은 몸을 안정시키고 수업에서 배운 점을 정리하는 시간입니다.',
  },
  spomove_linked: {
    objective: '오프라인 움직임과 화면 반응훈련을 연결해 집중 전환과 몰입감을 높입니다.',
    safetyNotes: [
      '화면을 보는 동안 아이들이 한 방향으로 몰리지 않도록 위치를 안내합니다.',
      '화면 반응 후 실제 이동 구간의 충돌 위험을 먼저 확인합니다.',
    ],
    parentNote: '오늘 활동은 화면 반응과 실제 움직임을 연결해 집중력과 반응 조절을 함께 경험하도록 구성했습니다.',
  },
};

export const LESSON_PACKAGE_DETAIL_TEMPLATE_FALLBACK: LessonPackageDetailTemplate = {
  objective: '수업 목표를 명확히 하고 안전하게 활동할 수 있도록 구성합니다.',
  safetyNotes: [
    '활동 전 공간과 동선을 점검합니다.',
    '아이들이 과열되지 않도록 쉬는 시간을 확보합니다.',
  ],
  parentNote: '오늘 활동은 아이들이 즐겁게 몸을 움직이며 함께 배우는 경험을 쌓는 수업입니다.',
};
