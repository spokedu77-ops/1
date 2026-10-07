import { describe, expect, it } from 'vitest';
import { applyMasterPremiumEntitlement, buildSpokeduMasterAccessSnapshot, type SpokeduMasterEntitlementGrantRow, type SpokeduMasterSubscriptionRow } from './spokeduMasterAccess';

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

function grant(overrides: Partial<SpokeduMasterEntitlementGrantRow> = {}): SpokeduMasterEntitlementGrantRow {
  return {
    id: 'grant-1',
    plan: 'premium',
    source: 'event',
    campaign_id: 'launch-2026',
    starts_at: '2020-01-01T00:00:00.000Z',
    ends_at: '2099-01-01T00:00:00.000Z',
    activated_at: '2020-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('SPOKEDU MASTER server access snapshot', () => {
  it('keeps no-subscription users limited to class tools', () => {
    expect(buildSpokeduMasterAccessSnapshot({ row: null, isAdmin: false })).toMatchObject({
      authenticated: true,
      plan: 'free',
      subscriptionStatus: 'none',
      canUseLibrary: false,
      canUseClassTools: true,
      canUseAttendance: false,
      canUseRecords: false,
      canUseSpomove: false,
    });
  });

  it('allows lite materials, tools, attendance, and records but not SPOMOVE', () => {
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
      canUseAttendance: true,
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

  it('uses a premium promotion without a billing subscription', () => {
    expect(buildSpokeduMasterAccessSnapshot({ row: null, grant: grant(), isAdmin: false })).toMatchObject({
      plan: 'premium',
      subscriptionStatus: 'active',
      entitlementSource: 'promotion',
      promotionalPlan: 'premium',
      canUseAttendance: true,
      canUseRecords: true,
      canUseSpomove: true,
    });
  });

  it('grants 30-day Lite records without SPOMOVE and falls back to Free after expiry', () => {
    const activeLiteGrant = grant({ plan: 'lite', ends_at: '2099-01-31T00:00:00.000Z' });
    expect(buildSpokeduMasterAccessSnapshot({ row: null, grant: activeLiteGrant, isAdmin: false })).toMatchObject({
      plan: 'lite',
      entitlementSource: 'promotion',
      canUseLibrary: true,
      canUseAttendance: true,
      canUseRecords: true,
      canUseSpomove: false,
    });

    expect(buildSpokeduMasterAccessSnapshot({
      row: null,
      grant: { ...activeLiteGrant, ends_at: '2020-01-31T00:00:00.000Z' },
      isAdmin: false,
    })).toMatchObject({
      plan: 'free',
      canUseLibrary: false,
      canUseAttendance: false,
      canUseRecords: false,
      canUseSpomove: false,
    });
  });

  it('temporarily elevates paid lite to premium and returns to lite after grant expiry', () => {
    const lite = row({ plan: 'lite', status: 'active', period_end: '2099-01-01T00:00:00.000Z' });
    expect(buildSpokeduMasterAccessSnapshot({ row: lite, grant: grant(), isAdmin: false })).toMatchObject({
      plan: 'premium', entitlementSource: 'promotion', canUseSpomove: true,
    });
    expect(buildSpokeduMasterAccessSnapshot({
      row: lite,
      grant: grant({ ends_at: '2020-01-02T00:00:00.000Z' }),
      isAdmin: false,
    })).toMatchObject({
      plan: 'lite', entitlementSource: 'billing', canUseAttendance: true, canUseRecords: true, canUseSpomove: false,
    });
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
      canUseAttendance: true,
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
      canUseClassTools: true,
      canUseAttendance: false,
      canUseRecords: false,
      canUseSpomove: false,
    });
  });

  it('denies access for non-active statuses such as past_due even before period_end', () => {
    expect(buildSpokeduMasterAccessSnapshot({
      row: row({
        plan: 'premium',
        status: 'past_due',
        period_end: '2099-01-01T00:00:00.000Z',
      }),
      isAdmin: false,
    })).toMatchObject({
      plan: 'premium',
      subscriptionStatus: 'expired',
      canUseLibrary: false,
      canUseClassTools: true,
      canUseAttendance: false,
      canUseRecords: false,
      canUseSpomove: false,
    });
  });

  it('assigns the named account an active premium snapshot', () => {
    const admin = buildSpokeduMasterAccessSnapshot({ row: null, isAdmin: true, onboardingDone: false });
    expect(applyMasterPremiumEntitlement(admin)).toMatchObject({
      onboardingDone: true,
      plan: 'premium',
      subscriptionStatus: 'active',
      isAdmin: false,
      isCenterOrTeam: false,
      canUseLibrary: true,
      canUseClassTools: true,
      canUseAttendance: true,
      canUseRecords: true,
      canUseSpomove: true,
    });
  });

  it('allows admin without forcing payment treatment', () => {
    expect(buildSpokeduMasterAccessSnapshot({ row: null, isAdmin: true })).toMatchObject({
      plan: 'team',
      isAdmin: true,
      isCenterOrTeam: true,
      canUseLibrary: true,
      canUseClassTools: true,
      canUseAttendance: true,
      canUseRecords: true,
      canUseSpomove: true,
    });
  });
});
