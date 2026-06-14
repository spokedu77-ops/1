import type { ClassRecord, UserProfile } from '../types';

export type RecentProgramActivityAction = 'video_started' | 'lesson_opened';

export type RecentProgramActivity = {
  ownerId: string;
  programId: string;
  programTitle: string;
  action: RecentProgramActivityAction;
  occurredAt: string;
  /** Persist v10 compatibility only. New navigation paths are derived from action. */
  resumeHref?: string;
};

export type RecentProgramActivityInput = Omit<RecentProgramActivity, 'ownerId' | 'resumeHref'>;

export type RecentActivityOwner = {
  ownerId: string;
  emailOwnerId: string | null;
};

export function getRecentActivityOwner(profile: UserProfile | null): RecentActivityOwner | null {
  const email = profile?.email?.trim().toLowerCase();
  const emailOwnerId = email ? `email:${email}` : null;
  const id = profile?.id?.trim();
  if (id && id !== 'local') return { ownerId: `id:${id}`, emailOwnerId };
  return emailOwnerId ? { ownerId: emailOwnerId, emailOwnerId } : null;
}

export function getRecentActivityOwnerId(profile: UserProfile | null) {
  return getRecentActivityOwner(profile)?.ownerId ?? null;
}

export function buildProgramResumeHref(
  programId: string,
  action: RecentProgramActivityAction | 'class_record',
) {
  return action === 'video_started'
    ? `/spokedu-master/library/${programId}?section=video&autoplay=1`
    : `/spokedu-master/library/${programId}`;
}

export function migrateRecentActivitiesToOwner(
  activities: RecentProgramActivity[],
  owner: RecentActivityOwner,
) {
  if (!owner.emailOwnerId || owner.emailOwnerId === owner.ownerId) return activities;

  const migrated = activities.map((activity) =>
    activity.ownerId === owner.emailOwnerId
      ? { ...activity, ownerId: owner.ownerId }
      : activity,
  );
  return deduplicateOwnerActivities(migrated, owner.ownerId);
}

function deduplicateOwnerActivities(
  activities: RecentProgramActivity[],
  ownerId: string,
) {
  const ownerActivities = activities
    .filter((activity) => activity.ownerId === ownerId)
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
  const otherActivities = activities.filter((activity) => activity.ownerId !== ownerId);
  const seen = new Set<string>();
  const deduplicated = ownerActivities.filter((activity) => {
    if (seen.has(activity.programId)) return false;
    seen.add(activity.programId);
    return true;
  });
  return [...deduplicated.slice(0, 50), ...otherActivities];
}

export function upsertRecentProgramActivity(
  activities: RecentProgramActivity[],
  input: RecentProgramActivityInput,
  ownerId: string,
) {
  const next: RecentProgramActivity = { ...input, ownerId };
  const withoutCurrentProgram = activities.filter(
    (activity) =>
      activity.ownerId !== ownerId ||
      activity.programId !== input.programId,
  );
  return deduplicateOwnerActivities([next, ...withoutCurrentProgram], ownerId);
}

export function selectUserRecentProgramActivities(
  activities: RecentProgramActivity[],
  ownerId: string,
) {
  return activities
    .filter((activity) => activity.ownerId === ownerId)
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
}

export function reconcileRecentProgramActivities(
  activities: RecentProgramActivity[],
  programs: Array<{ id: string; title: string }>,
) {
  const programsById = new Map(programs.map((program) => [program.id, program]));
  return activities
    .filter((activity) => programsById.has(activity.programId))
    .map((activity) => ({
      ...activity,
      programTitle: programsById.get(activity.programId)?.title ?? activity.programTitle,
    }));
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
    .filter((record) => record.programId && record.ownerId === ownerId)
    .sort((a, b) => b.date.localeCompare(a.date))[0];

  const activityCandidate = recentActivity
    ? {
        programId: recentActivity.programId,
        programTitle: recentActivity.programTitle,
        occurredAt: recentActivity.occurredAt,
        resumeHref: buildProgramResumeHref(recentActivity.programId, recentActivity.action),
        source: recentActivity.action,
      } satisfies LatestProgramResume
    : null;
  const recordCandidate = recentRecord
    ? {
        programId: recentRecord.programId,
        programTitle: recentRecord.programTitle || recentRecord.lessonTitle,
        occurredAt: recentRecord.date,
        resumeHref: buildProgramResumeHref(recentRecord.programId, 'class_record'),
        source: 'class_record',
      } satisfies LatestProgramResume
    : null;

  if (!activityCandidate) return recordCandidate;
  if (!recordCandidate) return activityCandidate;
  return activityCandidate.occurredAt >= recordCandidate.occurredAt
    ? activityCandidate
    : recordCandidate;
}
