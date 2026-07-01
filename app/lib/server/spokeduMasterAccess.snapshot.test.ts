import { describe, expect, it } from 'vitest';
import { buildSpokeduMasterAccessSnapshot, type SpokeduMasterSubscriptionRow } from './spokeduMasterAccess';

function row(overrides: Partial<SpokeduMasterSubscriptionRow>): SpokeduMasterSubscriptionRow {
  return {
    plan: null,
    status: null,
    period_end: null,
    trial_started_at: null,
    trial_ends_at: null,
    cancel_at_period_end: false,
    next_billing_at: null,
    current_period_end: null,
    ...overrides,
  };
}

describe('SPOKEDU MASTER server access snapshot', () => {
  it('returns false capabilities for no subscription', () => {
    expect(buildSpokeduMasterAccessSnapshot({ row: null, isAdmin: false })).toMatchObject({
      authenticated: true,
      plan: 'free',
      subscriptionStatus: 'none',
      canUseLibrary: false,
      canUseClassTools: false,
      canUseRecords: false,
      canUseSpomove: false,
    });
  });

  it('allows lite except SPOMOVE', () => {
    expect(buildSpokeduMasterAccessSnapshot({
      row: row({
        plan: 'lite',
        status: 'active',
        period_end: '2099-01-01T00:00:00.000Z',
        current_period_end: '2099-01-01T00:00:00.000Z',
      }),
      isAdmin: false,
    })).toMatchObject({
      plan: 'lite',
      subscriptionStatus: 'active',
      canUseLibrary: true,
      canUseClassTools: true,
      canUseRecords: true,
      canUseSpomove: false,
    });
  });

  it('allows premium SPOMOVE', () => {
    expect(buildSpokeduMasterAccessSnapshot({
      row: row({
        plan: 'premium',
        status: 'active',
        period_end: '2099-01-01T00:00:00.000Z',
      }),
      isAdmin: false,
    }).canUseSpomove).toBe(true);
  });

  it('keeps cancel-at-period-end access until the period ends', () => {
    expect(buildSpokeduMasterAccessSnapshot({
      row: row({
        plan: 'lite',
        status: 'active',
        period_end: '2099-01-01T00:00:00.000Z',
        cancel_at_period_end: true,
      }),
      isAdmin: false,
    })).toMatchObject({
      cancelAtPeriodEnd: true,
      canUseLibrary: true,
      canUseRecords: true,
    });
  });

  it('returns false capabilities for expired paid subscriptions', () => {
    expect(buildSpokeduMasterAccessSnapshot({
      row: row({
        plan: 'premium',
        status: 'expired',
        period_end: '2020-01-01T00:00:00.000Z',
      }),
      isAdmin: false,
    })).toMatchObject({
      plan: 'premium',
      subscriptionStatus: 'expired',
      canUseLibrary: false,
      canUseClassTools: false,
      canUseRecords: false,
      canUseSpomove: false,
    });
  });

  it('allows admin without forcing payment treatment', () => {
    expect(buildSpokeduMasterAccessSnapshot({ row: null, isAdmin: true })).toMatchObject({
      plan: 'team',
      isAdmin: true,
      isCenterOrTeam: true,
      canUseLibrary: true,
      canUseClassTools: true,
      canUseRecords: true,
      canUseSpomove: true,
    });
  });
});
