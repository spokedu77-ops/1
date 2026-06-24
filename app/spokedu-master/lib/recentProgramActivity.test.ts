import { describe, expect, it } from 'vitest';

import type { ClassRecord } from '../types';
import {
  buildProgramResumeHref,
  flushPendingRecentProgramActivities,
  getRecentActivityOwner,
  getRecentActivityOwnerId,
  migrateRecentActivitiesToOwner,
  reconcileRecentProgramActivities,
  reconcileRecentSpomoveActivities,
  selectLatestProgramResume,
  selectRecentSpomoveActivity,
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

  it('flushes one pending activity once the owner is resolved', () => {
    const owner = getRecentActivityOwner({ id: 'user-a', email: 'a@example.com' } as never);
    const flushed = flushPendingRecentProgramActivities([], [input], owner!);
    expect(selectUserRecentProgramActivities(flushed, 'id:user-a')).toEqual([
      expect.objectContaining({
        programId: input.programId,
        action: 'video_started',
      }),
    ]);
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

// ── SPOMOVE 활동 분리 ────────────────────────────────────────────────────────

const OWNER = 'id:user-a';

function makeLesson(programId: string, occurredAt: string) {
  return { programId, programTitle: `수업 ${programId}`, action: 'lesson_opened' as const, occurredAt };
}

function makeSpomove(programId: string, occurredAt: string) {
  return { programId, programTitle: `SPOMOVE ${programId}`, action: 'spomove_started' as const, occurredAt };
}

describe('SPOMOVE 활동 분리', () => {
  it('일반 수업만 있을 때 수업 선택 함수는 수업을 반환하고 SPOMOVE 선택 함수는 null 반환', () => {
    const stored = upsertRecentProgramActivity([], makeLesson('L1', '2026-06-14T10:00:00.000Z'), OWNER);
    expect(selectUserRecentProgramActivities(stored, OWNER)).toHaveLength(1);
    expect(selectRecentSpomoveActivity(stored, OWNER)).toBeNull();
  });

  it('SPOMOVE만 있을 때 SPOMOVE 선택 함수는 반환하고 수업 선택 함수는 빈 배열 반환', () => {
    const stored = upsertRecentProgramActivity([], makeSpomove('P1', '2026-06-14T10:00:00.000Z'), OWNER);
    expect(selectUserRecentProgramActivities(stored, OWNER)).toHaveLength(0);
    const spomove = selectRecentSpomoveActivity(stored, OWNER);
    expect(spomove).not.toBeNull();
    expect(spomove?.programId).toBe('P1');
  });

  it('같은 SPOMOVE를 여러 번 실행하면 최신 하나만 유지됨', () => {
    const step1 = upsertRecentProgramActivity([], makeSpomove('P1', '2026-06-14T10:00:00.000Z'), OWNER);
    const step2 = upsertRecentProgramActivity(step1, makeSpomove('P1', '2026-06-14T12:00:00.000Z'), OWNER);
    const ownerSpomoves = step2.filter((a) => a.action === 'spomove_started' && a.ownerId === OWNER);
    expect(ownerSpomoves).toHaveLength(1);
    expect(ownerSpomoves[0].occurredAt).toBe('2026-06-14T12:00:00.000Z');
  });

  it('같은 ID를 가진 일반 수업과 SPOMOVE는 서로 덮어쓰지 않음 (도메인 분리)', () => {
    const step1 = upsertRecentProgramActivity([], makeLesson('X1', '2026-06-14T10:00:00.000Z'), OWNER);
    const step2 = upsertRecentProgramActivity(step1, makeSpomove('X1', '2026-06-14T11:00:00.000Z'), OWNER);
    expect(selectUserRecentProgramActivities(step2, OWNER)).toHaveLength(1);
    expect(selectUserRecentProgramActivities(step2, OWNER)[0].programId).toBe('X1');
    expect(selectRecentSpomoveActivity(step2, OWNER)?.programId).toBe('X1');
  });

  it('reconcileRecentProgramActivities 결과에 spomove_started가 포함되지 않음', () => {
    const step1 = upsertRecentProgramActivity([], makeSpomove('P1', '2026-06-14T10:00:00.000Z'), OWNER);
    const step2 = upsertRecentProgramActivity(step1, makeLesson('L1', '2026-06-14T11:00:00.000Z'), OWNER);
    const reconciled = reconcileRecentProgramActivities(step2, [{ id: 'L1', title: '수업A' }]);
    expect(reconciled.some((a) => a.action === 'spomove_started')).toBe(false);
    // 원본에서는 여전히 SPOMOVE 조회 가능
    expect(selectRecentSpomoveActivity(step2, OWNER)).not.toBeNull();
  });

  it('일반 프로그램 목록에 없는 SPOMOVE preset은 reconcileRecentSpomoveActivities로 별도 제외', () => {
    const step1 = upsertRecentProgramActivity([], makeSpomove('valid-preset', '2026-06-14T10:00:00.000Z'), OWNER);
    const step2 = upsertRecentProgramActivity(step1, makeSpomove('invalid-preset', '2026-06-14T11:00:00.000Z'), OWNER);
    const validIds = new Set(['valid-preset']);
    const result = reconcileRecentSpomoveActivities(step2, validIds);
    expect(result).toHaveLength(1);
    expect(result[0].programId).toBe('valid-preset');
  });

  it('삭제된 일반 수업은 reconcile 이후 최근 활동에서 제외됨', () => {
    const step1 = upsertRecentProgramActivity([], makeLesson('deleted', '2026-06-14T10:00:00.000Z'), OWNER);
    const step2 = upsertRecentProgramActivity(step1, makeLesson('active', '2026-06-14T09:00:00.000Z'), OWNER);
    const reconciled = reconcileRecentProgramActivities(step2, [{ id: 'active', title: '유지 수업' }]);
    expect(reconciled.some((a) => a.programId === 'deleted')).toBe(false);
    expect(reconciled.some((a) => a.programId === 'active')).toBe(true);
  });

  it('잘못된 날짜 형식(빈 문자열)이 있어도 정렬이 오류 없이 처리됨', () => {
    const step1 = upsertRecentProgramActivity([], makeLesson('L1', '2026-06-14T10:00:00.000Z'), OWNER);
    const step2 = upsertRecentProgramActivity(step1, { ...makeLesson('L2', ''), occurredAt: '' }, OWNER);
    expect(() => selectUserRecentProgramActivities(step2, OWNER)).not.toThrow();
    expect(selectUserRecentProgramActivities(step2, OWNER)).toHaveLength(2);
  });

  it('spomove href는 session?preset= 경로로 파생됨', () => {
    expect(buildProgramResumeHref('reaction-cognition-quad-color-01', 'spomove_started'))
      .toBe('/spokedu-master/spomove/session?preset=reaction-cognition-quad-color-01');
  });
});
