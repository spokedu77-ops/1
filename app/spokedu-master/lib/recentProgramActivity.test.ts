import { describe, expect, it } from 'vitest';

import type { ClassRecord } from '../types';
import {
  buildProgramResumeHref,
  getRecentActivityOwner,
  getRecentActivityOwnerId,
  migrateRecentActivitiesToOwner,
  reconcileRecentProgramActivities,
  selectLatestProgramResume,
  selectUserRecentProgramActivities,
  type RecentProgramActivity,
  upsertRecentProgramActivity,
} from './recentProgramActivity';

const input = {
  programId: '52',
  programTitle: '밴드 씨름',
  action: 'video_started' as const,
  occurredAt: '2026-06-14T10:00:00.000Z',
};

function record(date: string, programId = '10', ownerId = 'id:user-a'): ClassRecord {
  return {
    id: `record-${programId}`,
    ownerId,
    lessonTitle: '기록 수업',
    classId: 'A',
    programId,
    programTitle: '기록 수업',
    date,
    present: 0,
    absent: 0,
    focusCount: 0,
    skillCount: 0,
    kakaoSent: false,
    students: [],
  };
}

describe('recent program activity', () => {
  it('starts empty', () => {
    expect(selectUserRecentProgramActivities([], 'id:user-a')).toEqual([]);
  });

  it('deduplicates by program and refreshes the timestamp', () => {
    const first = upsertRecentProgramActivity([], input, 'id:user-a');
    const second = upsertRecentProgramActivity(
      first,
      { ...input, occurredAt: '2026-06-14T11:00:00.000Z' },
      'id:user-a',
    );
    expect(second).toHaveLength(1);
    expect(second[0].occurredAt).toBe('2026-06-14T11:00:00.000Z');
  });

  it('replaces the latest action for the same program', () => {
    const first = upsertRecentProgramActivity([], input, 'id:user-a');
    const second = upsertRecentProgramActivity(
      first,
      {
        ...input,
        action: 'lesson_opened',
        occurredAt: '2026-06-14T12:00:00.000Z',
      },
      'id:user-a',
    );
    expect(second).toHaveLength(1);
    expect(second[0]).toMatchObject({
      action: 'lesson_opened',
    });
  });

  it('sorts a user activity list from newest to oldest', () => {
    const first = upsertRecentProgramActivity([], input, 'id:user-a');
    const second = upsertRecentProgramActivity(
      first,
      {
        ...input,
        programId: '53',
        occurredAt: '2026-06-14T12:00:00.000Z',
      },
      'id:user-a',
    );
    expect(selectUserRecentProgramActivities(second, 'id:user-a').map((item) => item.programId))
      .toEqual(['53', '52']);
  });

  it('keeps different users separate', () => {
    const first = upsertRecentProgramActivity([], input, 'id:user-a');
    const second = upsertRecentProgramActivity(first, input, 'id:user-b');
    expect(selectUserRecentProgramActivities(second, 'id:user-a')).toHaveLength(1);
    expect(selectUserRecentProgramActivities(second, 'id:user-b')).toHaveLength(1);
  });

  it('uses a stable profile ID before email and isolates local profiles by email', () => {
    expect(getRecentActivityOwnerId({ id: 'user-1', email: 'A@EXAMPLE.COM' } as never))
      .toBe('id:user-1');
    expect(getRecentActivityOwnerId({ id: 'local', email: 'A@EXAMPLE.COM' } as never))
      .toBe('email:a@example.com');
    expect(getRecentActivityOwnerId(null)).toBeNull();
  });

  it('keeps fifty entries per owner without deleting other owners', () => {
    const otherOwner = upsertRecentProgramActivity([], input, 'id:user-b');
    const activities = Array.from({ length: 51 }, (_, index) => ({
      ...input,
      programId: String(index),
      occurredAt: `2026-06-14T10:${String(index).padStart(2, '0')}:00.000Z`,
    })).reduce<RecentProgramActivity[]>(
      (items, activity) => upsertRecentProgramActivity(items, activity, 'id:user-a'),
      otherOwner,
    );
    expect(selectUserRecentProgramActivities(activities, 'id:user-a')).toHaveLength(50);
    expect(selectUserRecentProgramActivities(activities, 'id:user-b')).toHaveLength(1);
    expect(activities.some((activity) => activity.programId === '0')).toBe(false);
  });

  it('migrates only the matching email owner to a stable user ID', () => {
    const emailActivity = upsertRecentProgramActivity([], input, 'email:a@example.com');
    const otherActivity = upsertRecentProgramActivity(emailActivity, input, 'email:b@example.com');
    const owner = getRecentActivityOwner({ id: 'user-a', email: 'A@example.com' } as never);
    expect(owner).not.toBeNull();
    const migrated = migrateRecentActivitiesToOwner(otherActivity, owner!);
    expect(selectUserRecentProgramActivities(migrated, 'id:user-a')).toHaveLength(1);
    expect(selectUserRecentProgramActivities(migrated, 'email:b@example.com')).toHaveLength(1);
  });

  it('does not migrate anonymous or a different email owner', () => {
    const anonymousActivity = upsertRecentProgramActivity([], input, 'anonymous');
    const otherActivity = upsertRecentProgramActivity(
      anonymousActivity,
      { ...input, programId: '53' },
      'email:b@example.com',
    );
    const owner = getRecentActivityOwner({ id: 'user-a', email: 'a@example.com' } as never);
    const migrated = migrateRecentActivitiesToOwner(otherActivity, owner!);
    expect(selectUserRecentProgramActivities(migrated, 'id:user-a')).toHaveLength(0);
    expect(selectUserRecentProgramActivities(migrated, 'anonymous')).toHaveLength(1);
    expect(selectUserRecentProgramActivities(migrated, 'email:b@example.com')).toHaveLength(1);
  });

  it('drops missing programs and refreshes titles from the current public program list', () => {
    const activities = [
      ...upsertRecentProgramActivity([], input, 'id:user-a'),
      ...upsertRecentProgramActivity(
        [],
        { ...input, programId: 'missing', programTitle: 'Deleted program' },
        'id:user-a',
      ),
    ];
    expect(reconcileRecentProgramActivities(activities, [{ id: '52', title: 'Current title' }]))
      .toEqual([
        expect.objectContaining({
          programId: '52',
          programTitle: 'Current title',
        }),
      ]);
  });

  it('derives resume href from the action', () => {
    expect(buildProgramResumeHref('52', 'video_started'))
      .toBe('/spokedu-master/library/52?section=video&autoplay=1');
    expect(buildProgramResumeHref('52', 'lesson_opened'))
      .toBe('/spokedu-master/library/52');
  });

  it('prefers a newer video activity over a class record', () => {
    const activities = upsertRecentProgramActivity([], input, 'id:user-a');
    expect(
      selectLatestProgramResume(
        activities,
        [record('2026-06-13T10:00:00.000Z')],
        'id:user-a',
      )?.programId,
    ).toBe('52');
  });

  it('keeps a newer class record', () => {
    const activities = upsertRecentProgramActivity([], input, 'id:user-a');
    expect(
      selectLatestProgramResume(
        activities,
        [record('2026-06-15T10:00:00.000Z')],
        'id:user-a',
      )?.source,
    ).toBe('class_record');
  });

  it('ignores legacy class records without an owner', () => {
    const legacyRecord = record('2026-06-15T10:00:00.000Z');
    delete legacyRecord.ownerId;
    expect(selectLatestProgramResume([], [legacyRecord], 'id:user-a')).toBeNull();
  });
});
