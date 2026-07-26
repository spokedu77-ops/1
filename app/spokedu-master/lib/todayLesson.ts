import type { UserProfile } from '../types';
import { getRecentActivityOwnerId } from './recentProgramActivity';

/** 오늘 지정 수업 — owner별 1개, 당일(dayKey)만 유효 */
export type TodayLessonAssignment = {
  programId: string;
  programTitle: string;
  assignedAt: string;
  dayKey: string;
};

/** 교사 현장 기준. 브라우저 로컬 TZ 사용 금지. */
export const TODAY_LESSON_TIME_ZONE = 'Asia/Seoul';

export function getTodayLessonOwnerId(profile: UserProfile | null): string | null {
  return getRecentActivityOwnerId(profile);
}

/**
 * Asia/Seoul 달력 기준 YYYY-MM-DD.
 * @deprecated 이름만 호환 — 실제는 Seoul. 신규 코드는 getSeoulDayKey 사용.
 */
export function getLocalDayKey(date = new Date()): string {
  return getSeoulDayKey(date);
}

/** Asia/Seoul 달력 기준 YYYY-MM-DD (운영 계약) */
export function getSeoulDayKey(date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TODAY_LESSON_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;
  if (!year || !month || !day) {
    // Intl 실패 시에만 UTC 날짜 — 계약상 정상 경로 아님
    return date.toISOString().slice(0, 10);
  }
  return `${year}-${month}-${day}`;
}

export function normalizeTodayLessonAssignment(value: unknown): TodayLessonAssignment | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const programId = typeof row.programId === 'string' ? row.programId.trim() : '';
  const programTitle = typeof row.programTitle === 'string' ? row.programTitle.trim() : '';
  const assignedAt = typeof row.assignedAt === 'string' ? row.assignedAt : '';
  const dayKey = typeof row.dayKey === 'string' ? row.dayKey : '';
  if (!programId || !dayKey) return null;
  return {
    programId,
    programTitle: programTitle || programId,
    assignedAt: assignedAt || new Date().toISOString(),
    dayKey,
  };
}

export function normalizeTodayLessonByOwner(
  byOwner: unknown,
): Record<string, TodayLessonAssignment> {
  if (!byOwner || typeof byOwner !== 'object' || Array.isArray(byOwner)) return {};
  const next: Record<string, TodayLessonAssignment> = {};
  for (const [ownerId, value] of Object.entries(byOwner)) {
    if (!ownerId.startsWith('id:') && !ownerId.startsWith('email:')) continue;
    const assignment = normalizeTodayLessonAssignment(value);
    if (assignment) next[ownerId] = assignment;
  }
  return next;
}

/** 오늘이 아니면 null — 만료된 지정은 호출 측에서 정리 */
export function getActiveTodayLesson(
  byOwner: Record<string, TodayLessonAssignment>,
  ownerId: string | null,
  dayKey = getSeoulDayKey(),
): TodayLessonAssignment | null {
  if (!ownerId) return null;
  const assignment = byOwner[ownerId];
  if (!assignment) return null;
  if (assignment.dayKey !== dayKey) return null;
  return assignment;
}

export function setTodayLessonForOwner(
  byOwner: Record<string, TodayLessonAssignment>,
  ownerId: string | null,
  program: { id: string; title: string },
  dayKey = getSeoulDayKey(),
): Record<string, TodayLessonAssignment> {
  if (!ownerId || !program.id) return byOwner;
  return {
    ...byOwner,
    [ownerId]: {
      programId: program.id,
      programTitle: program.title.trim() || program.id,
      assignedAt: new Date().toISOString(),
      dayKey,
    },
  };
}

export function clearTodayLessonForOwner(
  byOwner: Record<string, TodayLessonAssignment>,
  ownerId: string | null,
): Record<string, TodayLessonAssignment> {
  if (!ownerId || !byOwner[ownerId]) return byOwner;
  const next = { ...byOwner };
  delete next[ownerId];
  return next;
}
