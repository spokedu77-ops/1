import { describe, expect, it } from 'vitest';
import { buildMasterAdminAccess, deriveMasterAdminBillingIncident, grantStatus, maskAdminEmail } from './spokeduMasterAdmin';

const paid = (plan: 'lite' | 'premium') => ({ plan, status: 'active', period_end: '2026-12-01T00:00:00.000Z' });
const promo = (plan: 'lite' | 'premium') => ({ id: 'g1', plan, source: 'event' as const, campaign_id: null, starts_at: '2026-10-01T00:00:00.000Z', ends_at: '2026-11-01T00:00:00.000Z', activated_at: '2026-10-01T00:00:00.000Z' });
const now = Date.parse('2026-10-02T00:00:00.000Z');

describe('MASTER ADMIN access presentation', () => {
  it('keeps paid Lite while Premium promo overlays it', () => {
    expect(buildMasterAdminAccess({ subscription: paid('lite'), grant: promo('premium'), now })).toMatchObject({ paidPlan: 'lite', effectivePlan: 'premium', fallbackPlan: 'lite' });
  });
  it('falls back to Free for a promotion-only member', () => {
    expect(buildMasterAdminAccess({ subscription: null, grant: promo('premium'), now })).toMatchObject({ paidPlan: 'free', effectivePlan: 'premium', fallbackPlan: 'free' });
  });
  it('does not downgrade paid Premium with Lite promo', () => {
    expect(buildMasterAdminAccess({ subscription: paid('premium'), grant: promo('lite'), now })).toMatchObject({ paidPlan: 'premium', effectivePlan: 'premium', fallbackPlan: 'premium' });
  });
  it('classifies grant lifecycle without deleting rows', () => {
    expect(grantStatus({ ...promo('premium'), revoked_at: '2026-10-02T00:00:00.000Z' }, now)).toBe('revoked');
    expect(grantStatus(promo('premium'), now)).toBe('active');
  });
  it('masks list email', () => expect(maskAdminEmail('teacher@example.com')).toBe('tea***@example.com'));
});

describe('MASTER ADMIN billing incident presentation', () => {
  const subscription = (overrides: Record<string, unknown> = {}) => ({
    status: 'active', cancelAtPeriodEnd: false, nextBillingAt: '2026-11-01T00:00:00.000Z',
    renewalRetryCount: 0, lastBillingError: null, nextRetryAt: null, ...overrides,
  });
  const activeOrder = { plan: 'lite', amount: 9900, status: 'active', paymentApproved: true, appliedAt: '2026-10-01T00:00:00.000Z' };

  it.each([
    ['A. 정상 Lite', subscription(), activeOrder, '정상'],
    ['B. 정상 Premium', subscription(), { ...activeOrder, plan: 'premium', amount: 28900 }, '정상'],
    ['C. cancel scheduled', subscription({ cancelAtPeriodEnd: true }), activeOrder, '해지 예약'],
    ['D. renewal failed + retry scheduled', subscription({ renewalRetryCount: 1, lastBillingError: 'declined', nextRetryAt: '2026-10-03T00:00:00.000Z' }), activeOrder, '재시도 예정'],
    ['E. charged but apply failed', subscription(), { ...activeOrder, status: 'recoverable_failed', appliedAt: null, lastErrorCode: 'apply_failed' }, '결제 승인 / 이용권 반영 실패'],
  ])('%s', (_name, sub, order, label) => {
    expect(deriveMasterAdminBillingIncident({ subscription: sub, order })).toMatchObject({ label });
  });

  it('F. keeps paid and promo plans separate while billing remains normal', () => {
    expect(buildMasterAdminAccess({ subscription: paid('lite'), grant: promo('premium'), now })).toMatchObject({
      paidPlan: 'lite', effectivePlan: 'premium', promoPlan: 'premium', fallbackPlan: 'lite',
    });
    expect(deriveMasterAdminBillingIncident({ subscription: subscription(), order: activeOrder })).toMatchObject({ label: '정상' });
  });
});
