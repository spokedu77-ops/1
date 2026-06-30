import { describe, expect, it } from 'vitest';

import {
  canBuySpomatAtMemberPrice,
  canUseClassTools,
  canUseLibrary,
  canUseRecords,
  canUseSpomove,
  hasMasterAccess,
  isPaidMasterPlan,
} from './subscription';
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
      plan: 'premium',
      subscriptionStatus: 'expired',
      periodEnd: '2026-06-01T00:00:00.000Z',
    });

    expect(isPaidMasterPlan(expired)).toBe(false);
    expect(hasMasterAccess(expired)).toBe(false);
  });

  it('allows only server-marked active paid access', () => {
    expect(hasMasterAccess(profile({ plan: 'team', subscriptionStatus: 'active' }))).toBe(true);
    expect(hasMasterAccess(profile({ plan: 'free', trialEndsAt: '2099-01-01T00:00:00.000Z' }))).toBe(false);
    expect(hasMasterAccess(profile({ plan: 'free', trialEndsAt: '2020-01-01T00:00:00.000Z' }))).toBe(false);
  });

  it('keeps Lite-equivalent paid access open for non-SPOMOVE features', () => {
    const lite = profile({ plan: 'lite', subscriptionStatus: 'active' });
    expect(canUseLibrary(lite)).toBe(true);
    expect(canUseClassTools(lite)).toBe(true);
    expect(canUseRecords(lite)).toBe(true);
    expect(canUseSpomove(lite)).toBe(false);
  });

  it('keeps Premium-equivalent paid access open for SPOMOVE', () => {
    const premium = profile({ plan: 'premium', subscriptionStatus: 'active' });
    expect(canUseSpomove(premium)).toBe(true);
  });

  it('allows SPOMAT member price only for Premium-equivalent active access', () => {
    expect(canBuySpomatAtMemberPrice(profile({ plan: 'premium', subscriptionStatus: 'active' }))).toBe(true);
    expect(canBuySpomatAtMemberPrice(profile({ plan: 'lite', subscriptionStatus: 'active' }))).toBe(false);
    expect(canBuySpomatAtMemberPrice(profile({ plan: 'team', subscriptionStatus: 'active' }))).toBe(false);
    expect(canBuySpomatAtMemberPrice(profile({ plan: 'free', trialEndsAt: '2099-01-01T00:00:00.000Z' }))).toBe(false);
  });
});
