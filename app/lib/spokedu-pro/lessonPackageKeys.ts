/**
 * 수업안 고도화 — 패키지 키 상수·라벨.
 * CSV import/export는 추후 연결; 파싱/직렬화 유틸만 분리해 둔다.
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
  new_student: '신규 원생 적응',
  teamwork: '팀워크·협동',
  warmup: '워밍업',
  cooldown: '마무리 활동',
  spomove_linked: 'SPOMOVE 연계',
};

/**
 * 대시보드 상단에서 우선 노출할 패키지 키(콘텐츠가 있을 때만 사용).
 * 라이브러리 빠른 필터 전체 10종과 별개.
 */
export const LESSON_PACKAGE_DASHBOARD_PRIORITY: LessonPackageKeyId[] = [
  'kindergarten_focus',
  'elementary_agility',
  'no_equipment',
  'open_class',
  'warmup',
  'spomove_linked',
];

/** UI·필터 표시 순서 고정 */
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

/** 필터·체크박스용 (전체 제외) */
export const LESSON_PACKAGE_KEY_OPTIONS: { id: LessonPackageKeyId; label: string }[] = LESSON_PACKAGE_KEY_ORDER.map(
  (id) => ({ id, label: LESSON_PACKAGE_KEY_LABELS[id] })
);

export function isLessonPackageKeyId(v: string): v is LessonPackageKeyId {
  return v in LESSON_PACKAGE_KEY_LABELS;
}

/** package_keys JSON 배열에서 문자열 키만 추출 */
export function normalizePackageKeysFromDb(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((x): x is string => typeof x === 'string' && x.trim().length > 0).map((s) => s.trim());
}

/** 추후 CSV 셀 → 패키지 키 배열 (쉼표/줄바꿈 구분) */
export function parseLessonPackageKeysFromCsvCell(cell: string): string[] {
  return cell
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** 추후 CSV보내기용 */
export function serializeLessonPackageKeysForCsv(keys: string[]): string {
  return keys.join(',');
}

/** 패키지별 고도화 필드 초안(비어 있을 때만 적용) */
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
      '아이들 간 충돌이 생기지 않도록 간격을 확보합니다.',
    ],
    parentNote:
      '오늘 활동은 아이들이 규칙을 이해하고 신호에 맞춰 몸을 조절하는 경험을 돕는 수업입니다.',
  },
  elementary_agility: {
    objective: '순발력, 방향 전환, 민첩한 반응을 자극합니다.',
    safetyNotes: [
      '방향 전환 구간에서 아이들이 부딪히지 않도록 이동 동선을 나눕니다.',
      '경쟁보다 정확한 반응과 안전한 움직임을 강조합니다.',
    ],
    parentNote:
      '오늘 활동은 빠른 판단과 민첩한 움직임을 함께 경험하도록 구성된 수업입니다.',
  },
  no_equipment: {
    objective: '별도 준비물 없이 신체 조절, 반응, 협동을 경험합니다.',
    safetyNotes: ['공간 경계를 먼저 정하고 활동 범위를 명확히 안내합니다.'],
    parentNote:
      '오늘 활동은 특별한 도구 없이도 아이들이 몸을 조절하고 친구들과 함께 움직이는 경험을 돕습니다.',
  },
  open_class: {
    objective: '참여도, 성취감, 협동 경험을 학부모가 쉽게 관찰할 수 있게 구성합니다.',
    safetyNotes: ['모든 아이가 성공 경험을 느낄 수 있도록 난이도를 조절합니다.'],
    parentNote:
      '오늘 활동은 아이들이 즐겁게 움직이면서 협동과 도전 경험을 쌓는 수업입니다.',
  },
  spomove_linked: {
    objective: '오프라인 움직임과 화면 반응훈련을 연결해 집중 전환과 몰입도를 높입니다.',
    safetyNotes: [
      '화면을 보는 동안 아이들이 한 방향으로 몰리지 않도록 위치를 나눕니다.',
    ],
    parentNote:
      '오늘 활동은 화면 반응과 실제 움직임을 연결해 집중력과 반응 조절을 함께 경험하도록 돕습니다.',
  },
};

export const LESSON_PACKAGE_DETAIL_TEMPLATE_FALLBACK: LessonPackageDetailTemplate = {
  objective: '수업 목표를 명확히 하고 안전하게 활동할 수 있도록 구성합니다.',
  safetyNotes: [
    '활동 전 공간과 동선을 점검합니다.',
    '아이들이 과열되지 않도록 쉬는 시간을 확보합니다.',
  ],
  parentNote: '오늘 활동은 아이들이 즐겁게 몸을 쓰며 함께 배우는 경험을 돕습니다.',
};
