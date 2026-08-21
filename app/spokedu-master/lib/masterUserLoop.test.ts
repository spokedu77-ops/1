import { describe, expect, it } from 'vitest';
import type { UserProfile } from '../types';
import { isMasterFirstUser, selectMasterLoopAction } from './masterUserLoop';

const profile: UserProfile = {
  id: 'user-1', name: 'Teacher', email: 'teacher@example.com', school: '', avatarColor: '#000000',
  plan: 'free', role: 'teacher', centerId: null, centerName: null, ageGroups: [], programTypes: [],
  onboardingDone: true, trialEndsAt: null, createdAt: '2026-06-01T00:00:00.000Z',
};
const base = { profile, recentLessonActivities: [], recentSpomoveActivities: [], sessionCount: 0, explanationCount: 0 };

describe('master Session loop', () => {
  it('treats an empty account as first use', () => {
    expect(isMasterFirstUser({ studentCount: 0, sessionCount: 0, recentLessonActivities: [], recentSpomoveActivities: [] })).toBe(true);
  });
  it('recognizes Session operation history', () => {
    expect(isMasterFirstUser({ studentCount: 0, sessionCount: 1, recentLessonActivities: [], recentSpomoveActivities: [] })).toBe(false);
    expect(selectMasterLoopAction({ ...base, sessionCount: 1, entitlement: { hasEntitlement: true } }).key).toBe('operate');
  });
  it('starts with choosing a lesson when there is no use history', () => {
    expect(selectMasterLoopAction(base).key).toBe('choose_lesson');
  });
});
