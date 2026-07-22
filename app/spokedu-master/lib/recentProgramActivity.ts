import type { ClassRecord, UserProfile } from '../types';

export type RecentProgramActivityAction = 'video_started' | 'lesson_opened' | 'spomove_started';

export type RecentProgramActivity = {
  ownerId: string;
  programId: string;
  programTitle: string;
  action: RecentProgramActivityAction;
  occurredAt: string;
  /** Persist v10 compatibility only. New navigation paths are derived from action. */
  resumeHref?: string;
  /** SPOMOVE 신체동작 레이어 (optional — 구 데이터 폴백) */
  activityFamilyId?: string;
  baseMovement?: string;
  limbRule?: string;
  movementLabel?: string;
  cueSeconds?: number;
  /** 난이도 재현용 (optional) */
  difficultyKind?: string;
  difficultyValue?: string;
  /** O3 Operation Snapshot V2 — Recent 「같은 설정」 재현 */
  spomoveSnapshot?: import('../spomove/operations/operationTypes').SpomoveSessionSnapshotV2;
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
  if (action === 'spomove_started') return `/spokedu-master/spomove/session?preset=${programId}`;
  return action === 'video_started'
    ? `/spokedu-master/library/${programId}?section=video&autoplay=1`
    : `/spokedu-master/library/${programId}`;
}

export function selectRecentSpomoveActivity(
  activities: RecentProgramActivity[],
  ownerId: string,
): RecentProgramActivity | null {
  return (
    activities
      .filter((a) => a.ownerId === ownerId && a.action === 'spomove_started')
      .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))[0] ?? null
  );
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

export function flushPendingRecentProgramActivities(
  activities: RecentProgramActivity[],
  pending: RecentProgramActivityInput[],
  owner: RecentActivityOwner,
) {
  return pending.reduce(
    (items, activity) => upsertRecentProgramActivity(items, activity, owner.ownerId),
    migrateRecentActivitiesToOwner(activities, owner),
  );
}

// SPOMOVE와 일반 수업을 분리하는 도메인 접두사 — 같은 programId 충돌 방지
function activityDomain(action: RecentProgramActivityAction): 's' | 'l' {
  return action === 'spomove_started' ? 's' : 'l';
}

function activityDedupeKey(activity: RecentProgramActivity): string {
  return `${activityDomain(activity.action)}:${activity.programId}`;
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
    const key = activityDedupeKey(activity);
    if (seen.has(key)) return false;
    seen.add(key);
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
  const inputDomain = activityDomain(input.action);
  const withoutCurrentProgram = activities.filter(
    (activity) =>
      activity.ownerId !== ownerId ||
      activity.programId !== input.programId ||
      activityDomain(activity.action) !== inputDomain,
  );
  return deduplicateOwnerActivities([next, ...withoutCurrentProgram], ownerId);
}

// 일반 수업(video_started, lesson_opened)만 반환 — spomove_started 제외
export function selectUserRecentProgramActivities(
  activities: RecentProgramActivity[],
  ownerId: string,
) {
  return activities
    .filter((activity) => activity.ownerId === ownerId && activity.action !== 'spomove_started')
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
}

// 일반 라이브러리 프로그램에만 적용. SPOMOVE 활동은 포함하지 않는다.
export function reconcileRecentProgramActivities(
  activities: RecentProgramActivity[],
  programs: Array<{ id: string; title: string }>,
) {
  const programsById = new Map(programs.map((program) => [program.id, program]));
  return activities
    .filter((activity) => activity.action !== 'spomove_started' && programsById.has(activity.programId))
    .map((activity) => ({
      ...activity,
      programTitle: programsById.get(activity.programId)?.title ?? activity.programTitle,
    }));
}

// SPOMOVE preset ID 유효성 확인. programs 배열과 별도로 처리한다.
export function reconcileRecentSpomoveActivities(
  activities: RecentProgramActivity[],
  validPresetIds: ReadonlySet<string>,
): RecentProgramActivity[] {
  return activities.filter(
    (a) => a.action === 'spomove_started' && validPresetIds.has(a.programId),
  );
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
