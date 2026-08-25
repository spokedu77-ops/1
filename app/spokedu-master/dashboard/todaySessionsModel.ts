import { getSeoulSessionDay } from '../lib/sessionDateTime';
import type { MasterClassDto, MasterSessionDto } from '../types/operational';
import { deriveMasterSessionWorkState, type MasterSessionWorkState } from '../lib/masterSessionWorkState';

export type TodaySessionCardModel = {
  session: MasterSessionDto;
  rosterCount: number;
  activityCount: number;
  completedActivityCount: number;
  hasSpomove: boolean;
  ctaLabel: string | null;
  href: string;
  workState: MasterSessionWorkState;
};

/**
 * Home "오늘 수업" keeps calendar-day scope (seoulDay).
 * WorkState supplies CTA/label grammar without expanding into a multi-day queue.
 */
export function buildTodaySessionCards(
  sessions: MasterSessionDto[],
  classes: MasterClassDto[],
  seoulDay: string,
  now = new Date(),
): TodaySessionCardModel[] {
  const classesById = new Map(classes.map((item) => [item.id, item]));

  return sessions
    .filter((session) => getSeoulSessionDay(session.startAt) === seoulDay)
    .sort((left, right) => {
      const statusOrder = { scheduled: 0, completed: 1, cancelled: 2 } as const;
      return statusOrder[left.status] - statusOrder[right.status]
        || left.startAt.localeCompare(right.startAt)
        || left.id.localeCompare(right.id);
    })
    .map((session) => {
      const classItem = classesById.get(session.classId) ?? null;
      const workState = deriveMasterSessionWorkState(session, classItem, now);
      return {
        session,
        rosterCount: classItem?.studentIds.length ?? 0,
        activityCount: workState.progress.total,
        completedActivityCount: workState.progress.completed,
        hasSpomove: session.programs.some((item) => item.sourceType === 'spomove'),
        ctaLabel: workState.primaryLabel,
        href: workState.href,
        workState,
      };
    });
}
