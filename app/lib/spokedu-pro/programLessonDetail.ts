/**
 * SPOKEDU PRO — 고도화 수업안 overlay (curriculum.id 기준).
 * ProgramDetail(checklist/equipment/…)과 분리한다.
 */

import type { LessonPackageKeyId } from '@/app/lib/spokedu-pro/lessonPackageKeys';

export type LessonDetailStatus = 'draft' | 'reviewed';

/** 추천 연령 (DB text, 선택값 그대로 저장) */
export const LESSON_DETAIL_RECOMMENDED_AGE_OPTIONS = [
  '유아',
  '초등 저학년',
  '초등 고학년',
  '유아·초등 공통',
] as const;

/** 권장 인원 */
export const LESSON_DETAIL_RECOMMENDED_PLAYERS_OPTIONS = ['소규모', '중규모', '대규모', '인원 무관'] as const;

/** 수업 시간 */
export const LESSON_DETAIL_DURATION_OPTIONS = ['5분', '10분', '15분', '20분 이상'] as const;

/** 공간 */
export const LESSON_DETAIL_SPACE_OPTIONS = ['좁은 공간', '일반 체육관', '넓은 공간', '야외 가능'] as const;

/** 수업 목표 (복수 선택 → DB에는 쉼표로 저장) */
export const LESSON_DETAIL_OBJECTIVE_OPTIONS = [
  '집중 유도',
  '순발력',
  '협동',
  '균형',
  '민첩성',
  '규칙 이해',
  '체력 향상',
] as const;

/** 발달 요소 (복수 선택 → DB에는 쉼표로 저장) */
export const LESSON_DETAIL_DEVELOPMENT_FOCUS_OPTIONS = [
  '신체 조절',
  '반응 조절',
  '공간 지각',
  '사회성',
  '문제 해결',
  '자신감',
  '리듬감',
] as const;

/** DB text → 토큰 배열 (쉼표·세미콜론) */
export function splitLessonDetailListField(raw: string | null | undefined): string[] {
  return String(raw ?? '')
    .split(/[,，;]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** 허용 목록 순서대로만 known에 담고, 나머지는 legacy 한 줄로 병합 */
export function partitionKnownLessonDetailTokens(
  parts: string[],
  orderedAllowed: readonly string[]
): { knownOrdered: string[]; legacy: string } {
  const allow = new Set(orderedAllowed);
  const knownOrdered: string[] = [];
  for (const label of orderedAllowed) {
    if (parts.some((p) => p === label)) knownOrdered.push(label);
  }
  const legacyParts = parts.filter((p) => !allow.has(p));
  return { knownOrdered, legacy: legacyParts.join(', ') };
}

export function serializeLessonDetailMultiField(knownOrdered: string[], legacy: string): string | null {
  const k = knownOrdered.join(', ');
  const l = legacy.trim();
  if (!k && !l) return null;
  if (k && l) return `${k}, ${l}`;
  return k || l;
}

export type LessonDetailAutoTextInput = {
  objectiveSelections: readonly string[];
  developmentSelections: readonly string[];
  packageKeys: readonly string[];
  space: string;
};

/**
 * 「기본 문구 생성」용. 호출 측에서 비어 있는 필드에만 병합할 것.
 */
export function buildLessonDetailAutoTexts(input: LessonDetailAutoTextInput): {
  parentNote?: string;
  safetyNotesLines?: string[];
  coachScript?: string;
} {
  const oPhrase =
    input.objectiveSelections.length > 0 ? input.objectiveSelections.join('·') : '다양한 수업 목표';
  const dPhrase =
    input.developmentSelections.length > 0 ? input.developmentSelections.join('·') : '발달 요소';

  const parentBase = `오늘 활동은 아이들이 ${oPhrase}을 중심으로 ${dPhrase}을 자연스럽게 경험하도록 구성된 수업입니다.`;

  const packageExtra: Partial<Record<LessonPackageKeyId, string>> = {
    kindergarten_focus: '아이들이 신호를 보고 몸을 조절하며 집중하는 경험을 돕습니다.',
    elementary_agility: '빠른 판단과 민첩한 움직임을 함께 경험하도록 돕습니다.',
    teamwork: '친구들과 규칙을 나누고 함께 움직이며 협동 경험을 쌓도록 돕습니다.',
    open_class: '학부모가 아이들의 참여도와 성취감을 쉽게 관찰할 수 있도록 구성했습니다.',
    spomove_linked: '화면 반응과 실제 움직임을 연결해 집중력과 반응 조절을 함께 경험하도록 돕습니다.',
  };

  const uniqKeys = [...new Set(input.packageKeys)];
  const orderedKeys = uniqKeys.filter((k): k is LessonPackageKeyId => k in packageExtra);
  const extras = orderedKeys.map((k) => packageExtra[k]).filter(Boolean) as string[];
  const parentNote = extras.length > 0 ? `${parentBase} ${extras.join(' ')}` : parentBase;

  const commonSafety = [
    '활동 전 이동 범위와 멈춤 신호를 먼저 안내합니다.',
    '아이들 간 충돌이 생기지 않도록 충분한 간격을 확보합니다.',
  ];
  const safetyNotesLines = [...commonSafety];
  if (input.space.trim() === '좁은 공간') {
    safetyNotesLines.push('속도 경쟁보다 정확한 반응과 안전한 움직임을 우선합니다.');
  }
  const agility =
    input.objectiveSelections.includes('순발력') || input.objectiveSelections.includes('민첩성');
  if (agility) {
    safetyNotesLines.push('방향 전환 구간에서 서로의 이동 동선이 겹치지 않도록 배치합니다.');
  }

  const coachScript =
    '선생님 신호를 잘 보고 움직여볼 거예요. 빠르게 움직이는 것도 좋지만, 친구와 부딪히지 않게 공간을 보면서 움직여봅시다.';

  return { parentNote, safetyNotesLines, coachScript };
}

/** 프로그램 뱅크·라이브러리 목록에 붙는 최소 스냅샷 (전체 `ProgramLessonDetail` 아님) */
export type ProgramLessonDetailLite = {
  isFeaturedLesson?: boolean;
  summary?: string | null;
  packageKeys?: unknown;
};

export type ProgramLessonDetail = {
  curriculumId: number;
  /** DB lesson row 갱신 시각(선택, 표시용) */
  updatedAt?: string;
  /** 작성 중 / 검수 완료 (DB status) */
  status: LessonDetailStatus;
  isFeaturedLesson: boolean;
  summary: string | null;
  recommendedAge: string | null;
  recommendedPlayers: string | null;
  duration: string | null;
  space: string | null;
  objective: string | null;
  developmentFocus: string | null;
  coachScript: string | null;
  parentNote: string | null;
  steps: unknown[];
  fieldTips: unknown[];
  variations: unknown[];
  safetyNotes: unknown[];
  relatedProgramIds: unknown[];
  relatedSpomoveIds: unknown[];
  packageKeys: unknown[];
};

export type ProgramLessonDetailRow = {
  id: string;
  curriculum_id: number;
  status?: string | null;
  is_featured_lesson: boolean;
  summary: string | null;
  recommended_age: string | null;
  recommended_players: string | null;
  duration: string | null;
  space: string | null;
  objective: string | null;
  development_focus: string | null;
  coach_script: string | null;
  parent_note: string | null;
  steps: unknown;
  field_tips: unknown;
  variations: unknown;
  safety_notes: unknown;
  related_program_ids: unknown;
  related_spomove_ids: unknown;
  package_keys: unknown;
  created_at: string;
  updated_at: string;
};

function asJsonArray(v: unknown): unknown[] {
  if (Array.isArray(v)) return v;
  if (v == null) return [];
  return [];
}

function normalizeLessonStatus(raw: string | null | undefined): LessonDetailStatus {
  const s = String(raw ?? '').trim().toLowerCase();
  return s === 'reviewed' ? 'reviewed' : 'draft';
}

/** 완성도 계산용 필드(문자열 trim / 배열 length) */
export const LESSON_DETAIL_COMPLETION_KEYS = [
  'summary',
  'objective',
  'steps',
  'fieldTips',
  'variations',
  'safetyNotes',
  'parentNote',
] as const;

/** `as const` 배열의 `.length`는 튜플 길이 리터럴로 잡혀 `=== 0` 분기가 무의미해지므로 분모는 항상 number로 둔다 */
const LESSON_DETAIL_COMPLETION_TOTAL: number = LESSON_DETAIL_COMPLETION_KEYS.length;

export type LessonDetailCompletionKey = (typeof LESSON_DETAIL_COMPLETION_KEYS)[number];

export function isLessonDetailFieldFilled(ld: ProgramLessonDetail, key: LessonDetailCompletionKey): boolean {
  if (key === 'steps' || key === 'fieldTips' || key === 'variations' || key === 'safetyNotes') {
    const arr = ld[key] as unknown[];
    return Array.isArray(arr) && arr.length > 0;
  }
  const v = ld[key];
  return typeof v === 'string' && v.trim().length > 0;
}

export function getLessonDetailCompletion(ld: ProgramLessonDetail | null | undefined): {
  filled: number;
  total: number;
  percent: number;
} {
  if (!ld) return { filled: 0, total: LESSON_DETAIL_COMPLETION_TOTAL, percent: 0 };
  let filled = 0;
  for (const k of LESSON_DETAIL_COMPLETION_KEYS) {
    if (isLessonDetailFieldFilled(ld, k)) filled += 1;
  }
  const total = LESSON_DETAIL_COMPLETION_TOTAL;
  const percent = total === 0 ? 0 : Math.round((filled / total) * 100);
  return { filled, total, percent };
}

export function mapLessonDetailRowToClient(row: ProgramLessonDetailRow): ProgramLessonDetail {
  return {
    curriculumId: row.curriculum_id,
    updatedAt: row.updated_at,
    status: normalizeLessonStatus(row.status),
    isFeaturedLesson: !!row.is_featured_lesson,
    summary: row.summary,
    recommendedAge: row.recommended_age,
    recommendedPlayers: row.recommended_players,
    duration: row.duration,
    space: row.space,
    objective: row.objective,
    developmentFocus: row.development_focus,
    coachScript: row.coach_script,
    parentNote: row.parent_note,
    steps: asJsonArray(row.steps),
    fieldTips: asJsonArray(row.field_tips),
    variations: asJsonArray(row.variations),
    safetyNotes: asJsonArray(row.safety_notes),
    relatedProgramIds: asJsonArray(row.related_program_ids),
    relatedSpomoveIds: asJsonArray(row.related_spomove_ids),
    packageKeys: asJsonArray(row.package_keys),
  };
}

/** Admin upsert용 DB 행 (전체 필드) */
export function lessonDetailFullToDbRow(d: ProgramLessonDetail): Record<string, unknown> {
  return {
    curriculum_id: d.curriculumId,
    status: d.status === 'reviewed' ? 'reviewed' : 'draft',
    is_featured_lesson: d.isFeaturedLesson,
    summary: d.summary,
    recommended_age: d.recommendedAge,
    recommended_players: d.recommendedPlayers,
    duration: d.duration,
    space: d.space,
    objective: d.objective,
    development_focus: d.developmentFocus,
    coach_script: d.coachScript,
    parent_note: d.parentNote,
    steps: d.steps,
    field_tips: d.fieldTips,
    variations: d.variations,
    safety_notes: d.safetyNotes,
    related_program_ids: d.relatedProgramIds,
    related_spomove_ids: d.relatedSpomoveIds,
    package_keys: d.packageKeys,
    updated_at: new Date().toISOString(),
  };
}
