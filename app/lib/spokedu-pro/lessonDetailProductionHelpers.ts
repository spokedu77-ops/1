/**
 * 수업안 고도화 관리 — 생산 라인용 헬퍼(초안 채우기·대표 후보 판별).
 * curriculum / programs 원본은 읽기만 한다.
 */

import type { ProgramLessonDetail } from '@/app/lib/spokedu-pro/programLessonDetail';
import { getLessonDetailCompletion } from '@/app/lib/spokedu-pro/programLessonDetail';

export type LegacyProgramFields = {
  title: string;
  activity_method?: string | null;
  activity_tip?: string | null;
};

export const DEFAULT_SAFETY_NOTE_LINES = [
  '수업 전 공간을 점검하고 아이들에게 활동 범위를 안내합니다.',
  '과격한 접촉이 없도록 간격을 유지합니다.',
];

export const DEFAULT_PARENT_NOTE_LINE =
  '오늘 활동은 아이들이 안전하게 몸을 쓰며 함께 즐길 수 있도록 구성된 수업입니다.';

function trimText(s: string | null | undefined): string {
  return String(s ?? '').trim();
}

function linesFromMultiline(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
}

function shortSummaryFromTitle(title: string): string {
  const t = trimText(title);
  if (!t) return '';
  return t.length > 140 ? `${t.slice(0, 137)}…` : t;
}

function unknownArrayToLines(arr: unknown[] | undefined): string {
  if (!Array.isArray(arr) || arr.length === 0) return '';
  return arr
    .map((x) => (typeof x === 'string' || typeof x === 'number' ? String(x) : ''))
    .filter(Boolean)
    .join('\n');
}

function linesToStringArrayLocal(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
}

/**
 * 기존 프로그램(제목·진행법·팁)으로 lesson_detail을 병합.
 * 비어 있던 필드만 채우고 나머지는 prev 유지. prev가 null이면 새 행 수준의 기본값으로 시작.
 */
export function mergeLessonDetailWithLegacyDraftFill(
  row: LegacyProgramFields & { id: number },
  prev: ProgramLessonDetail | null
): ProgramLessonDetail {
  const current = {
    summary: trimText(prev?.summary ?? ''),
    stepsText: unknownArrayToLines(prev?.steps as unknown[] | undefined),
    fieldTipsText: unknownArrayToLines(prev?.fieldTips as unknown[] | undefined),
    safetyNotesText: unknownArrayToLines(prev?.safetyNotes as unknown[] | undefined),
    parentNote: trimText(prev?.parentNote ?? ''),
  };
  const patch = patchesLegacyDraftFill(
    { title: row.title, activity_method: row.activity_method, activity_tip: row.activity_tip },
    current
  );

  const summaryFinal =
    patch.summary !== undefined ? trimText(patch.summary) || null : trimText(current.summary) || null;
  const stepsFinal =
    patch.stepsText !== undefined
      ? linesToStringArrayLocal(patch.stepsText)
      : Array.isArray(prev?.steps)
        ? (prev!.steps as unknown[]).filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
        : [];
  const fieldTipsFinal =
    patch.fieldTipsText !== undefined
      ? linesToStringArrayLocal(patch.fieldTipsText)
      : Array.isArray(prev?.fieldTips)
        ? (prev!.fieldTips as unknown[]).filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
        : [];
  const safetyFinal =
    patch.safetyNotesText !== undefined
      ? linesToStringArrayLocal(patch.safetyNotesText)
      : Array.isArray(prev?.safetyNotes)
        ? (prev!.safetyNotes as unknown[]).filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
        : [];
  const parentFinal =
    patch.parentNote !== undefined ? trimText(patch.parentNote) || null : trimText(current.parentNote) || null;

  return {
    curriculumId: row.id,
    status: prev?.status === 'reviewed' ? 'reviewed' : 'draft',
    isFeaturedLesson: prev?.isFeaturedLesson ?? false,
    summary: summaryFinal,
    recommendedAge: prev?.recommendedAge ?? null,
    recommendedPlayers: prev?.recommendedPlayers ?? null,
    duration: prev?.duration ?? null,
    space: prev?.space ?? null,
    objective: prev?.objective ?? null,
    developmentFocus: prev?.developmentFocus ?? null,
    coachScript: prev?.coachScript ?? null,
    parentNote: parentFinal,
    steps: stepsFinal,
    fieldTips: fieldTipsFinal,
    variations: Array.isArray(prev?.variations) ? prev!.variations : [],
    safetyNotes: safetyFinal,
    relatedProgramIds: Array.isArray(prev?.relatedProgramIds) ? prev!.relatedProgramIds : [],
    relatedSpomoveIds: Array.isArray(prev?.relatedSpomoveIds) ? prev!.relatedSpomoveIds : [],
    packageKeys: Array.isArray(prev?.packageKeys) ? prev!.packageKeys : [],
  };
}

/** 비어 있는 필드에만 레거시 프로그램 데이터·기본 문구 반영 */
export function patchesLegacyDraftFill(
  legacy: LegacyProgramFields,
  current: {
    summary: string;
    stepsText: string;
    fieldTipsText: string;
    safetyNotesText: string;
    parentNote: string;
  }
): Partial<typeof current> {
  const out: Partial<typeof current> = {};
  if (!trimText(current.summary)) {
    out.summary = shortSummaryFromTitle(legacy.title);
  }
  if (!trimText(current.stepsText) && trimText(legacy.activity_method)) {
    out.stepsText = linesFromMultiline(trimText(legacy.activity_method)).join('\n');
  }
  if (!trimText(current.fieldTipsText) && trimText(legacy.activity_tip)) {
    out.fieldTipsText = linesFromMultiline(trimText(legacy.activity_tip)).join('\n');
  }
  if (!trimText(current.safetyNotesText)) {
    out.safetyNotesText = DEFAULT_SAFETY_NOTE_LINES.join('\n');
  }
  if (!trimText(current.parentNote)) {
    out.parentNote = DEFAULT_PARENT_NOTE_LINE;
  }
  return out;
}

export function isFeaturedCandidateRow(row: {
  video_url?: string | null;
  activity_method?: string | null;
  activity_tip?: string | null;
  lesson_detail?: ProgramLessonDetail | null;
}): boolean {
  const hasVideo = Boolean(trimText(row.video_url));
  const ld = row.lesson_detail ?? null;
  const hasMethod = Boolean(trimText(row.activity_method));
  const hasLessonSteps = Array.isArray(ld?.steps) && ld.steps.length > 0;
  const { percent } = getLessonDetailCompletion(ld);
  const hasProgTip = Boolean(trimText(row.activity_tip));
  return hasVideo && (hasMethod || hasLessonSteps) && (percent >= 50 || hasProgTip);
}
