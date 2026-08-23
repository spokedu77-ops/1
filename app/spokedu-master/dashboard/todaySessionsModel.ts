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
      const cancelledOrder = Number(left.status === 'cancelled') - Number(right.status === 'cancelled');
      return cancelledOrder || left.startAt.localeCompare(right.startAt) || left.id.localeCompare(right.id);
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
