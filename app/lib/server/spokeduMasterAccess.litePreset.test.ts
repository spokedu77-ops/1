import { describe, expect, it } from 'vitest';
import {
  evaluateSpokeduMasterEffectiveEntitlement,
  shouldLoadLiteSpomoveTrialPreset,
  type SpokeduMasterEntitlementGrantRow,
  type SpokeduMasterSubscriptionRow,
} from './spokeduMasterAccess';

function subscription(overrides: Partial<SpokeduMasterSubscriptionRow> = {}): SpokeduMasterSubscriptionRow {
  return {
    plan: null,
    status: null,
    period_end: null,
    cancel_at_period_end: false,
    ...overrides,
  };
}

function promoGrant(overrides: Partial<SpokeduMasterEntitlementGrantRow> = {}): SpokeduMasterEntitlementGrantRow {
  return {
    id: 'grant-1',
    plan: 'lite',
    source: 'event',
    campaign_id: null,
    starts_at: '2020-01-01T00:00:00.000Z',
    ends_at: '2099-01-01T00:00:00.000Z',
    activated_at: '2020-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('shouldLoadLiteSpomoveTrialPreset', () => {
  it('loads only for active lite entitlement', () => {
    const activeLite = evaluateSpokeduMasterEffectiveEntitlement(
      subscription({ plan: 'lite', status: 'active', period_end: '2099-01-01T00:00:00.000Z' }),
      null,
    );
    const premium = evaluateSpokeduMasterEffectiveEntitlement(
      subscription({ plan: 'premium', status: 'active', period_end: '2099-01-01T00:00:00.000Z' }),
      null,
    );
    const free = evaluateSpokeduMasterEffectiveEntitlement(subscription(), null);
    const expiredLite = evaluateSpokeduMasterEffectiveEntitlement(
      subscription({ plan: 'lite', status: 'expired', period_end: '2020-01-01T00:00:00.000Z' }),
      null,
    );
    const promoLite = evaluateSpokeduMasterEffectiveEntitlement(subscription(), promoGrant({ plan: 'lite' }));

    expect(shouldLoadLiteSpomoveTrialPreset(activeLite)).toBe(true);
    expect(shouldLoadLiteSpomoveTrialPreset(promoLite)).toBe(true);
    expect(shouldLoadLiteSpomoveTrialPreset(premium)).toBe(false);
    expect(shouldLoadLiteSpomoveTrialPreset(free)).toBe(false);
    expect(shouldLoadLiteSpomoveTrialPreset(expiredLite)).toBe(false);
  });
});
