import { describe, expect, it } from 'vitest';

import { hasMasterAccess, isPaidMasterPlan } from './subscription';
import type { UserProfile } from '../types';

function profile(overrides: Partial<UserProfile>): UserProfile {
  return {
    id: 'user-a',
    name: 'QA',
    email: 'qa@example.test',
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

describe('SPOKEDU MASTER client subscription cache', () => {
  it('does not treat expired paid plans as active access', () => {
    const expired = profile({
      plan: 'pro',
      subscriptionStatus: 'expired',
      periodEnd: '2026-06-01T00:00:00.000Z',
    });

    expect(isPaidMasterPlan(expired)).toBe(false);
    expect(hasMasterAccess(expired)).toBe(false);
  });

  it('allows only server-marked active paid access or active trial cache', () => {
    expect(hasMasterAccess(profile({ plan: 'team', subscriptionStatus: 'active' }))).toBe(true);
    expect(hasMasterAccess(profile({ plan: 'free', trialEndsAt: '2099-01-01T00:00:00.000Z' }))).toBe(true);
    expect(hasMasterAccess(profile({ plan: 'free', trialEndsAt: '2020-01-01T00:00:00.000Z' }))).toBe(false);
  });
});
