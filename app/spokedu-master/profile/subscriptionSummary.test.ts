import { describe, expect, it } from 'vitest';

import {
  canStartPaidPlanCheckout,
  formatSubscriptionEndDate,
  getPaymentPageMode,
  getSubscriptionDisplaySummary,
  getSubscriptionPlanLabel,
  getSubscriptionPrimaryHref,
  getSubscriptionPrimaryLabel,
  getSubscriptionStatusLabel,
  normalizeSubscriptionSummary,
  type SubscriptionSummaryData,
} from './subscriptionSummary';

const future = '2099-06-30T00:00:00.000Z';
const past = '2020-01-01T00:00:00.000Z';

function summary(overrides: Partial<SubscriptionSummaryData>): SubscriptionSummaryData {
  return {
    plan: 'free',
    status: 'none',
    periodEnd: null,
    currentPeriodEnd: null,
    nextBillingAt: null,
    cancelAtPeriodEnd: false,
    trialEndsAt: null,
    isAdmin: false,
    canCancelAutoBilling: false,
    ...overrides,
  };
}

describe('subscriptionSummary', () => {
  it('maps active Premium billing subscriptions for display', () => {
    const value = summary({
      plan: 'premium',
      status: 'active',
      nextBillingAt: future,
      canCancelAutoBilling: true,
    });

    expect(getSubscriptionPlanLabel(value)).toBe('프리미엄');
    expect(getSubscriptionStatusLabel(value)).toBe('이용 중');
    expect(getSubscriptionPrimaryLabel(value)).toBe('구독 관리');
    expect(getSubscriptionPrimaryHref(value)).toBe('/spokedu-master/subscription');
    expect(getSubscriptionDisplaySummary(value)).toMatchObject({
      state: 'active',
      amountText: '월 28,900원',
      isDirectBillingPlan: true,
      canCancel: true,
      canUseSpomatMemberPrice: true,
    });
  });

  it('maps active Lite billing subscriptions for display', () => {
    const value = summary({
      plan: 'lite',
      status: 'active',
      nextBillingAt: future,
      canCancelAutoBilling: true,
    });

    expect(getSubscriptionPlanLabel(value)).toBe('라이트');
    expect(getSubscriptionStatusLabel(value)).toBe('이용 중');
    expect(getSubscriptionPrimaryLabel(value)).toBe('구독 관리');
    expect(getSubscriptionPrimaryHref(value)).toBe('/spokedu-master/subscription');
    expect(getSubscriptionDisplaySummary(value)).toMatchObject({
      state: 'active',
      amountText: '월 9,900원',
      isDirectBillingPlan: true,
      canCancel: true,
      canUseSpomatMemberPrice: false,
      canUpgradeToPremium: true,
      upgradeHref: '/spokedu-master/payment?plan=premium',
      upgradeLabel: '프리미엄으로 업그레이드',
    });
  });

  it('exposes lite to premium upgrade checkout on payment page', () => {
    const value = summary({
      plan: 'lite',
      status: 'active',
      nextBillingAt: future,
      canCancelAutoBilling: true,
    });

    expect(getPaymentPageMode(value)).toBe('liteUpgrade');
    expect(canStartPaidPlanCheckout(value, 'premium')).toBe(true);
    expect(canStartPaidPlanCheckout(value, 'lite')).toBe(false);
  });

  it('blocks new checkout for active premium subscriptions', () => {
    const value = summary({
      plan: 'premium',
      status: 'active',
      nextBillingAt: future,
      canCancelAutoBilling: true,
    });

    expect(getPaymentPageMode(value)).toBe('blocked');
    expect(canStartPaidPlanCheckout(value, 'premium')).toBe(false);
    expect(canStartPaidPlanCheckout(value, 'lite')).toBe(false);
    expect(getSubscriptionDisplaySummary(value)).toMatchObject({
      canUpgradeToPremium: false,
      upgradeHref: null,
    });
  });

  it('hides cancellation for manually issued paid subscriptions', () => {
    const value = summary({ plan: 'premium', status: 'active', nextBillingAt: future });

    expect(getSubscriptionDisplaySummary(value)).toMatchObject({
      state: 'active',
      isDirectBillingPlan: false,
      canCancel: false,
      description: '수동 발급 또는 기관 관리 이용권입니다. 변경이 필요하면 고객센터로 문의해 주세요.',
    });
  });

  it('maps active Center or admin subscriptions as managed access without payment CTAs', () => {
    const center = summary({ plan: 'team', status: 'active', periodEnd: future });
    const admin = summary({ plan: 'free', status: 'active', isAdmin: true });

    expect(getSubscriptionPlanLabel(center)).toBe('센터/기관');
    expect(getSubscriptionStatusLabel(center)).toBe('기관 관리');
    expect(getSubscriptionDisplaySummary(center)).toMatchObject({
      state: 'managed',
      primaryHref: null,
      canCancel: false,
    });
    expect(getSubscriptionDisplaySummary(admin)).toMatchObject({
      planLabel: '관리자 권한',
      state: 'managed',
      primaryHref: null,
      canCancel: false,
    });
  });

  it('shows cancel_at_period_end as 해지 예정 without a second cancel action', () => {
    const value = summary({
      plan: 'premium',
      status: 'active',
      currentPeriodEnd: future,
      cancelAtPeriodEnd: true,
      canCancelAutoBilling: true,
    });

    expect(getSubscriptionStatusLabel(value)).toBe('해지 예정');
    expect(getSubscriptionPrimaryLabel(value)).toBe('구독 관리');
    expect(getSubscriptionDisplaySummary(value)).toMatchObject({
      state: 'cancelScheduled',
      dateLabel: '이용 종료일',
      canCancel: false,
    });
  });

  it('shows expired paid subscriptions as ended', () => {
    const value = summary({ plan: 'premium', status: 'expired', periodEnd: past });

    expect(getSubscriptionStatusLabel(value)).toBe('이용 종료');
    expect(getSubscriptionPrimaryLabel(value)).toBe('이용권 선택');
    expect(getSubscriptionDisplaySummary(value)).toMatchObject({
      state: 'ended',
      primaryHref: '/spokedu-master/payment',
    });
  });

  it('maps legacy pro plan as Premium for existing data only', () => {
    const value = summary({ plan: 'pro', status: 'active', nextBillingAt: future });

    expect(getSubscriptionPlanLabel(value)).toBe('프리미엄');
    expect(getSubscriptionStatusLabel(value)).toBe('이용 중');
  });

  it('shows free users without trial as no subscription', () => {
    const value = summary({ plan: 'free', status: 'none', trialEndsAt: future });

    expect(getSubscriptionPlanLabel(value)).toBe('없음');
    expect(getSubscriptionStatusLabel(value)).toBe('이용권 없음');
    expect(getSubscriptionPrimaryHref(value)).toBe('/spokedu-master/payment');
    expect(getSubscriptionDisplaySummary(value)).toMatchObject({
      state: 'none',
      primaryLabel: '이용권 선택',
    });
  });

  it('normalizes unknown API values without exposing raw status as user copy', () => {
    const value = normalizeSubscriptionSummary({
      plan: 'enterprise',
      status: 'past_due',
      periodEnd: 123,
      trialEndsAt: future,
      isAdmin: false,
    });

    expect(value).toEqual({
      plan: 'free',
      status: 'past_due',
      periodEnd: null,
      currentPeriodEnd: null,
      nextBillingAt: null,
      cancelAtPeriodEnd: false,
      trialEndsAt: future,
      isAdmin: false,
      canCancelAutoBilling: false,
    });
    expect(getSubscriptionStatusLabel(value)).toBe('이용권 없음');
  });

  it('normalizes lite and premium plans', () => {
    const lite = normalizeSubscriptionSummary({
      plan: 'lite',
      status: 'active',
      cancelAtPeriodEnd: true,
      nextBillingAt: future,
      canCancelAutoBilling: true,
    });
    expect(lite.plan).toBe('lite');
    expect(lite.cancelAtPeriodEnd).toBe(true);
    expect(lite.nextBillingAt).toBe(future);
    expect(lite.canCancelAutoBilling).toBe(true);

    const premium = normalizeSubscriptionSummary({ plan: 'premium', status: 'active' });
    expect(premium.plan).toBe('premium');
    expect(premium.cancelAtPeriodEnd).toBe(false);
    expect(premium.canCancelAutoBilling).toBe(false);
  });

  it('formats Korean end dates and handles missing values', () => {
    expect(formatSubscriptionEndDate(null)).toBe('종료일 없음');
    expect(formatSubscriptionEndDate('not-a-date')).toBe('이용 기간 확인 중');
    expect(formatSubscriptionEndDate('2026-06-23T00:00:00.000Z')).toContain('2026');
  });
});
