import type { ClassRecord, UserProfile } from '../types';

export type RecentProgramActivityAction = 'video_started' | 'lesson_opened';

export type RecentProgramActivity = {
  ownerId: string;
  programId: string;
  programTitle: string;
  action: RecentProgramActivityAction;
  occurredAt: string;
  resumeHref: string;
};

export type RecentProgramActivityInput = Omit<RecentProgramActivity, 'ownerId'>;

export function getRecentActivityOwnerId(profile: UserProfile | null) {
  const id = profile?.id?.trim();
  if (id && id !== 'local') return `id:${id}`;
  const email = profile?.email?.trim().toLowerCase();
  return email ? `email:${email}` : 'anonymous';
}

export function upsertRecentProgramActivity(
  activities: RecentProgramActivity[],
  input: RecentProgramActivityInput,
  ownerId: string,
) {
  const next: RecentProgramActivity = { ...input, ownerId };
  return [
    next,
    ...activities.filter(
      (activity) =>
        activity.ownerId !== ownerId ||
        activity.programId !== input.programId,
    ),
  ]
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
    .slice(0, 50);
}

export function selectUserRecentProgramActivities(
  activities: RecentProgramActivity[],
  ownerId: string,
) {
  return activities
    .filter((activity) => activity.ownerId === ownerId)
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
}

export type LatestProgramResume = {
  programId: string;
  programTitle: string;
  occurredAt: string;
  resumeHref: string;
  source: RecentProgramActivityAction | 'class_record';
};

export function selectLatestProgramResume(
  activities: RecentProgramActivity[],
  classRecords: ClassRecord[],
  ownerId: string,
): LatestProgramResume | null {
  const recentActivity = selectUserRecentProgramActivities(activities, ownerId)[0];
  const recentRecord = [...classRecords]
    .filter((record) => record.programId)
    .sort((a, b) => b.date.localeCompare(a.date))[0];

  const activityCandidate = recentActivity
    ? {
        programId: recentActivity.programId,
        programTitle: recentActivity.programTitle,
        occurredAt: recentActivity.occurredAt,
        resumeHref: recentActivity.resumeHref,
        source: recentActivity.action,
      } satisfies LatestProgramResume
    : null;
  const recordCandidate = recentRecord
    ? {
        programId: recentRecord.programId,
        programTitle: recentRecord.programTitle || recentRecord.lessonTitle,
        occurredAt: recentRecord.date,
        resumeHref: `/spokedu-master/library/${recentRecord.programId}`,
        source: 'class_record',
      } satisfies LatestProgramResume
    : null;

  if (!activityCandidate) return recordCandidate;
  if (!recordCandidate) return activityCandidate;
  return activityCandidate.occurredAt >= recordCandidate.occurredAt
    ? activityCandidate
    : recordCandidate;
}
