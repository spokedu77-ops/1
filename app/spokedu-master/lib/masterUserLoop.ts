import type { RecentProgramActivity } from './recentProgramActivity';

export function isMasterFirstUser(input: {
  studentCount: number;
  sessionCount: number;
  recentLessonActivities: RecentProgramActivity[];
  recentSpomoveActivities: RecentProgramActivity[];
}) {
  return (
    input.studentCount === 0
    && input.sessionCount === 0
    && input.recentLessonActivities.length === 0
    && input.recentSpomoveActivities.length === 0
  );
}
