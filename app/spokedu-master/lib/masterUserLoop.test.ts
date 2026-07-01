import { describe, expect, it } from 'vitest';
import type { ClassRecord, UserProfile } from '../types';
import { isMasterFirstUser, selectMasterLoopAction } from './masterUserLoop';
import type { RecentProgramActivity } from './recentProgramActivity';

function profile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    id: 'user-1',
    name: 'Teacher',
    email: 'teacher@example.com',
    school: '',
    avatarColor: '#000000',
    plan: 'free',
    role: 'teacher',
    centerId: null,
    centerName: null,
    ageGroups: [],
    programTypes: [],
    onboardingDone: true,
    trialEndsAt: null,
    createdAt: '2026-06-01T00:00:00.000Z',
    ...overrides,
  };
}

function record(): ClassRecord {
  return {
    id: 'record-1',
    lessonTitle: 'Lesson',
    classId: 'A',
    programId: 'program-1',
    programTitle: 'Lesson',
    date: '2026-06-28T00:00:00.000Z',
    present: 1,
    absent: 0,
    focusCount: 0,
    skillCount: 0,
    kakaoSent: false,
    students: [],
  };
}

function activity(action: RecentProgramActivity['action'], programId?: string): RecentProgramActivity {
  return {
    ownerId: 'id:user-1',
    programId: programId ?? (action === 'spomove_started' ? 'preset-1' : 'program-1'),
    programTitle: 'Recent',
    action,
    occurredAt: '2026-06-28T00:00:00.000Z',
  };
}

const base = {
  profile: profile(),
  recentLessonActivities: [] as RecentProgramActivity[],
  recentSpomoveActivities: [] as RecentProgramActivity[],
  classRecords: [] as ClassRecord[],
  explanationCount: 0,
};

describe('isMasterFirstUser', () => {
  it('only treats users with no students, records, or valid recent activity as first users', () => {
    expect(isMasterFirstUser({
      studentCount: 0,
      classRecords: [],
      recentLessonActivities: [],
      recentSpomoveActivities: [],
    })).toBe(true);
  });

  it('does not treat valid lesson or SPOMOVE activity as first use', () => {
    expect(isMasterFirstUser({
      studentCount: 0,
      classRecords: [],
      recentLessonActivities: [activity('lesson_opened')],
      recentSpomoveActivities: [],
    })).toBe(false);
    expect(isMasterFirstUser({
      studentCount: 0,
      classRecords: [],
      recentLessonActivities: [],
      recentSpomoveActivities: [activity('spomove_started')],
    })).toBe(false);
  });
});

describe('selectMasterLoopAction', () => {
  it('sends a new unsubscribed user to lesson discovery first', () => {
    expect(selectMasterLoopAction(base)).toMatchObject({
      key: 'choose_lesson',
      href: '/spokedu-master/library',
    });
  });

  it('sends lesson-only users to class records', () => {
    expect(selectMasterLoopAction({
      ...base,
      recentLessonActivities: [activity('lesson_opened')],
    })).toMatchObject({ key: 'start_record' });
  });

  it('sends SPOMOVE-only users back to SPOMOVE without pretending a lesson record is possible', () => {
    expect(selectMasterLoopAction({
      ...base,
      recentSpomoveActivities: [activity('spomove_started')],
    })).toMatchObject({
      key: 'rerun_spomove',
      href: '/spokedu-master/spomove/session?preset=preset-1',
    });
  });

  it('sends users with records to next preparation', () => {
    expect(selectMasterLoopAction({
      ...base,
      classRecords: [record()],
    })).toMatchObject({ key: 'prepare_next', href: '/spokedu-master/activity' });
  });


  it('keeps active Premium users focused on operation when they have records', () => {
    expect(selectMasterLoopAction({
      ...base,
      profile: profile({ plan: 'premium', subscriptionStatus: 'active' }),
      classRecords: [record()],
    })).toMatchObject({ key: 'operate' });
  });

  it('keeps active Center users on the same operation loop', () => {
    expect(selectMasterLoopAction({
      ...base,
      profile: profile({ plan: 'team', subscriptionStatus: 'active' }),
      classRecords: [record()],
    })).toMatchObject({ key: 'operate' });
  });
});
