/**
 * MASTER Temporal / Operational Debt presentation contract.
 *
 * WorkState (`deriveMasterSessionWorkState`) remains the meaning SSOT.
 * This module maps that meaning onto longitudinal surfaces without inventing
 * new Session statuses or a Debt table.
 *
 * Temporal meaning (product vocabulary — not UI labels):
 *   NOW       — today operational Session (Home primary)
 *   NEXT      — future scheduled
 *   DEBT      — unresolved past work (overdue scheduled | attendance gap)
 *   HISTORY   — completed with attendance resolved
 *   CANCELLED — cancelled record (visible until soft-delete)
 *   REMOVED   — soft-deleted (hidden from operational lists)
 *
 * Surface ordering (same WorkState, different presentation):
 *   HOME     — Today first (calendar-day scope). Debt does NOT expand Home into a queue.
 *   CLASS    — Class-scoped unresolved / next work (NO horizon cutoff).
 *   CALENDAR — Chronological discovery of NOW/NEXT/DEBT/HISTORY/CANCELLED.
 *
 * `buildMasterWorkQueue` overdueHorizonDays=14 is Home-adjacent noise control only.
 * It does NOT mean debt expires. Class / Calendar / debt counters use full history.
 */

import type { MasterClassDto, MasterSessionDto } from '../types/operational';
import { getSeoulSessionDay } from './sessionDateTime';
import {
  buildMasterWorkQueue,
  deriveMasterSessionWorkState,
  type MasterSessionWorkState,
  type MasterWorkQueueItem,
} from './masterSessionWorkState';

export type MasterTemporalMeaning = 'NOW' | 'NEXT' | 'DEBT' | 'HISTORY' | 'CANCELLED' | 'REMOVED';

export type MasterSurfaceOrdering = 'today-first' | 'unresolved-first' | 'chronological';

/** Home-adjacent work queue noise window — NOT debt extinction. */
export const MASTER_HOME_WORK_QUEUE_HORIZON_DAYS = 14;

export const MASTER_SURFACE_ORDERING = {
  home: 'today-first',
  class: 'unresolved-first',
  calendar: 'chronological',
} as const satisfies Record<'home' | 'class' | 'calendar', MasterSurfaceOrdering>;

export function isOperationalDebt(workState: MasterSessionWorkState): boolean {
  return workState.attention.overdue || workState.attention.attendanceMissing;
}

export function deriveMasterTemporalMeaning(
  session: MasterSessionDto,
  workState: MasterSessionWorkState,
): MasterTemporalMeaning {
  if (session.status === 'cancelled') return 'CANCELLED';
  if (isOperationalDebt(workState)) return 'DEBT';
  if (workState.timeRelation === 'today') return 'NOW';
  if (workState.timeRelation === 'upcoming') return 'NEXT';
  if (session.status === 'completed') return 'HISTORY';
  return 'NEXT';
}

/**
 * Class / Calendar / continuity counters: every unresolved debt Session.
 * No horizon — 15+ day overdue remains discoverable.
 */
export function buildOperationalDebtQueue({
  sessions,
  classes,
  now = new Date(),
}: {
  sessions: MasterSessionDto[];
  classes: MasterClassDto[];
  now?: Date;
}): MasterWorkQueueItem[] {
  return buildMasterWorkQueue({
    sessions,
    classes,
    now,
    overdueHorizonDays: Number.POSITIVE_INFINITY,
  }).filter((item) => isOperationalDebt(item.workState));
}

/** Class priority: unresolved debt first (full history), else horizon queue / next. */
export function buildClassPriorityWork({
  sessions,
  classItem,
  now = new Date(),
}: {
  sessions: MasterSessionDto[];
  classItem: MasterClassDto;
  now?: Date;
}): MasterWorkQueueItem | null {
  const scoped = sessions.filter((session) => session.classId === classItem.id);
  const debt = buildOperationalDebtQueue({ sessions: scoped, classes: [classItem], now })[0];
  if (debt) return debt;
  return buildMasterWorkQueue({
    sessions: scoped,
    classes: [classItem],
    now,
    overdueHorizonDays: MASTER_HOME_WORK_QUEUE_HORIZON_DAYS,
  })[0] ?? null;
}

export type PastOperationalDebtSummary = {
  count: number;
  /** Earliest overdue / attendance-gap session for deep-link preference */
  leadSessionId: string | null;
  leadClassId: string | null;
};

/**
 * Home continuity hint only: debt whose Seoul day is NOT today.
 * Does not list items on Home — count + link to Calendar/Class.
 */
export function summarizePastOperationalDebt({
  sessions,
  classes,
  now = new Date(),
}: {
  sessions: MasterSessionDto[];
  classes: MasterClassDto[];
  now?: Date;
}): PastOperationalDebtSummary {
  const today = getSeoulSessionDay(now);
  const pastDebt = buildOperationalDebtQueue({ sessions, classes, now })
    .filter((item) => getSeoulSessionDay(item.session.startAt) !== today);
  const lead = pastDebt[0] ?? null;
  return {
    count: pastDebt.length,
    leadSessionId: lead?.session.id ?? null,
    leadClassId: lead?.session.classId ?? null,
  };
}

export function sessionHasCalendarDebtSignal(
  session: MasterSessionDto,
  classItem: MasterClassDto | null | undefined,
  now: Date = new Date(),
): boolean {
  if (session.status === 'cancelled') return false;
  return isOperationalDebt(deriveMasterSessionWorkState(session, classItem, now));
}
