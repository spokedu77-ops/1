import { describe, expect, it } from 'vitest';
import { buildMasterFunnelEventKey, buildMasterFunnelWindow } from './spokeduMasterFunnel';

const now = Date.parse('2026-10-03T12:00:00.000Z');
const at = (daysAgo: number) => new Date(now - daysAgo * 86_400_000).toISOString();

describe('SPOKEDU MASTER commercial funnel', () => {
  it('measures the approved journey while excluding users outside the production population', () => {
    const result = buildMasterFunnelWindow({
      days: 30,
      now,
      members: [
        { id: 'free', createdAt: at(8), effectivePlan: 'free', subscription: null },
        { id: 'paid', createdAt: at(20), effectivePlan: 'premium', subscription: { cancelAtPeriodEnd: true, renewalRetryCount: 0, lastBillingError: null, nextRetryAt: null } },
        { id: 'failed', createdAt: at(40), effectivePlan: 'lite', subscription: { cancelAtPeriodEnd: false, renewalRetryCount: 1, lastBillingError: 'declined', nextRetryAt: at(-1) } },
      ],
      events: [
        { name: 'landing_visit', user_id: null, created_at: at(1) },
        { name: 'onboarding_completed', user_id: 'free', created_at: at(7) },
        { name: 'first_value_program_detail', user_id: 'free', created_at: at(6) },
        { name: 'core_use_daily', user_id: 'free', created_at: at(5) },
        { name: 'upgrade_intent', user_id: 'paid', created_at: at(4) },
        { name: 'checkout_started', user_id: 'paid', created_at: at(3) },
        { name: 'first_value_program_detail', user_id: 'qa-user', created_at: at(2) },
        { name: 'checkout_started', user_id: 'internal-user', created_at: at(2) },
      ],
      payments: [
        { user_id: 'paid', applied_at: at(2) },
        { user_id: 'qa-user', applied_at: at(2) },
      ],
    });

    expect(result).toMatchObject({
      landingVisits: 1,
      signups: 2,
      onboardingCompleted: 1,
      firstValue: 1,
      returningUse: 1,
      upgradeIntent: 1,
      checkoutStarted: 1,
      paymentSuccess: 1,
      activePaid: 2,
      cancelScheduled: 1,
      renewalFailures: 1,
    });
  });

  it('does not count same-day authenticated use as returning use', () => {
    const createdAt = '2026-10-03T01:00:00.000Z';
    const result = buildMasterFunnelWindow({
      days: 7,
      now,
      members: [{ id: 'new-user', createdAt, effectivePlan: 'free', subscription: null }],
      events: [{ name: 'core_use_daily', user_id: 'new-user', created_at: '2026-10-03T11:00:00.000Z' }],
      payments: [],
    });
    expect(result.returningUse).toBe(0);
  });

  it('uses stable one-time and daily idempotency keys without fabricating history', () => {
    expect(buildMasterFunnelEventKey('first_value_program_detail', 'user-1')).toBe('master:first_value_program_detail:user-1');
    expect(buildMasterFunnelEventKey('core_use_daily', 'user-1', new Date('2026-10-03T23:59:00Z'))).toBe('master:core_use_daily:user-1:2026-10-03');
    expect(buildMasterFunnelEventKey('checkout_started', 'user-1')).toBeNull();
  });
});
