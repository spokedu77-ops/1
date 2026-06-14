import { describe, expect, it } from 'vitest';

import type { ClassRecord } from '../types';
import {
  getRecentActivityOwnerId,
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
  resumeHref: '/spokedu-master/library/52?section=video',
};

function record(date: string, programId = '10'): ClassRecord {
  return {
    id: `record-${programId}`,
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

  it('replaces the latest action and resume destination for the same program', () => {
    const first = upsertRecentProgramActivity([], input, 'id:user-a');
    const second = upsertRecentProgramActivity(
      first,
      {
        ...input,
        action: 'lesson_opened',
        occurredAt: '2026-06-14T12:00:00.000Z',
        resumeHref: '/spokedu-master/library/52',
      },
      'id:user-a',
    );
    expect(second).toHaveLength(1);
    expect(second[0]).toMatchObject({
      action: 'lesson_opened',
      resumeHref: '/spokedu-master/library/52',
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
    expect(getRecentActivityOwnerId(null)).toBe('anonymous');
  });

  it('keeps only the most recent fifty program entries', () => {
    const activities = Array.from({ length: 51 }, (_, index) => ({
      ...input,
      programId: String(index),
      occurredAt: `2026-06-14T10:${String(index).padStart(2, '0')}:00.000Z`,
    })).reduce<RecentProgramActivity[]>(
      (items, activity) => upsertRecentProgramActivity(items, activity, 'id:user-a'),
      [],
    );
    expect(activities).toHaveLength(50);
    expect(activities.some((activity) => activity.programId === '0')).toBe(false);
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
});
