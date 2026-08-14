import type { UserProfile } from '../types';
import { getRecentActivityOwnerId } from './recentProgramActivity';

export type TodayLessonAssignment = {
  programId: string;
  programTitle: string;
  assignedAt: string;
  dayKey: string;
};

export type TodayLessonsByOwner = Record<string, TodayLessonAssignment[]>;

export const TODAY_LESSON_TIME_ZONE = 'Asia/Seoul';

export function getTodayLessonOwnerId(profile: UserProfile | null): string | null {
  return getRecentActivityOwnerId(profile);
}

/** @deprecated Use getSeoulDayKey. */
export function getLocalDayKey(date = new Date()): string {
  return getSeoulDayKey(date);
}

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
  return year && month && day ? `${year}-${month}-${day}` : date.toISOString().slice(0, 10);
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

/** Normalizes both the legacy single-assignment shape and the new array shape. */
export function normalizeTodayLessonByOwner(byOwner: unknown): TodayLessonsByOwner {
  if (!byOwner || typeof byOwner !== 'object' || Array.isArray(byOwner)) return {};
  const next: TodayLessonsByOwner = {};
  for (const [ownerId, value] of Object.entries(byOwner)) {
    if (!ownerId.startsWith('id:') && !ownerId.startsWith('email:')) continue;
    const candidates = Array.isArray(value) ? value : [value];
    const seen = new Set<string>();
    const assignments = candidates.flatMap((candidate) => {
      const assignment = normalizeTodayLessonAssignment(candidate);
      if (!assignment || seen.has(assignment.programId)) return [];
      seen.add(assignment.programId);
      return [assignment];
    });
    if (assignments.length > 0) next[ownerId] = assignments;
  }
  return next;
}

export function getActiveTodayLessons(
  byOwner: TodayLessonsByOwner,
  ownerId: string | null,
  dayKey = getSeoulDayKey(),
): TodayLessonAssignment[] {
  if (!ownerId) return [];
  return (byOwner[ownerId] ?? []).filter((assignment) => assignment.dayKey === dayKey);
}

/** Compatibility helper for workflow code that uses the first lesson as its anchor. */
export function getActiveTodayLesson(
  byOwner: TodayLessonsByOwner,
  ownerId: string | null,
  dayKey = getSeoulDayKey(),
): TodayLessonAssignment | null {
  return getActiveTodayLessons(byOwner, ownerId, dayKey)[0] ?? null;
}

export function addTodayLessonForOwner(
  byOwner: TodayLessonsByOwner,
  ownerId: string | null,
  program: { id: string; title: string },
  dayKey = getSeoulDayKey(),
): TodayLessonsByOwner {
  if (!ownerId || !program.id) return byOwner;
  const active = getActiveTodayLessons(byOwner, ownerId, dayKey);
  if (active.some((assignment) => assignment.programId === program.id)) return byOwner;
  return {
    ...byOwner,
    [ownerId]: [...active, {
      programId: program.id,
      programTitle: program.title.trim() || program.id,
      assignedAt: new Date().toISOString(),
      dayKey,
    }],
  };
}

export const setTodayLessonForOwner = addTodayLessonForOwner;

export function removeTodayLessonForOwner(
  byOwner: TodayLessonsByOwner,
  ownerId: string | null,
  programId: string,
): TodayLessonsByOwner {
  if (!ownerId || !byOwner[ownerId]) return byOwner;
  const remaining = byOwner[ownerId].filter((assignment) => assignment.programId !== programId);
  if (remaining.length === byOwner[ownerId].length) return byOwner;
  const next = { ...byOwner };
  if (remaining.length > 0) next[ownerId] = remaining;
  else delete next[ownerId];
  return next;
}

export function clearTodayLessonForOwner(
  byOwner: TodayLessonsByOwner,
  ownerId: string | null,
): TodayLessonsByOwner {
  if (!ownerId || !byOwner[ownerId]) return byOwner;
  const next = { ...byOwner };
  delete next[ownerId];
  return next;
}
