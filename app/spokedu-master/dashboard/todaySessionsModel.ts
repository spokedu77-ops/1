import { getSeoulSessionDay } from '../lib/sessionDateTime';
import type { MasterClassDto, MasterSessionDto } from '../types/operational';

export type TodaySessionCardModel = {
  session: MasterSessionDto;
  rosterCount: number;
  activityCount: number;
  completedActivityCount: number;
  hasSpomove: boolean;
  ctaLabel: '수업 준비' | '수업 열기' | '수업 보기' | null;
  href: string;
};

export function buildTodaySessionCards(
  sessions: MasterSessionDto[],
  classes: MasterClassDto[],
  seoulDay: string,
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
    .map((session) => ({
      session,
      rosterCount: classesById.get(session.classId)?.studentIds.length ?? 0,
      activityCount: session.programs.length,
      completedActivityCount: session.programs.filter((item) => item.isCompleted).length,
      hasSpomove: session.programs.some((item) => item.sourceType === 'spomove'),
      ctaLabel:
        session.status === 'cancelled'
          ? null
          : session.status === 'completed'
            ? '수업 보기'
            : session.programs.length > 0
              ? '수업 열기'
              : '수업 준비',
      href: `/spokedu-master/activity?session=${encodeURIComponent(session.id)}`,
    }));
}
