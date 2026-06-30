import { describe, expect, it } from 'vitest';

import {
  formatSubscriptionEndDate,
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
    ...overrides,
  };
}

describe('subscriptionSummary', () => {
  it('maps active Premium subscriptions for display', () => {
    const value = summary({ plan: 'premium', status: 'active', periodEnd: future });

    expect(getSubscriptionPlanLabel(value)).toBe('프리미엄');
    expect(getSubscriptionStatusLabel(value)).toBe('구독 중');
    expect(getSubscriptionPrimaryLabel(value)).toBe('구독 관리');
    expect(getSubscriptionPrimaryHref(value)).toBe('/spokedu-master/subscription');
  });

  it('maps active Lite subscriptions for display', () => {
    const value = summary({ plan: 'lite', status: 'active', periodEnd: future });

    expect(getSubscriptionPlanLabel(value)).toBe('라이트');
    expect(getSubscriptionStatusLabel(value)).toBe('구독 중');
    expect(getSubscriptionPrimaryLabel(value)).toBe('구독 관리');
    expect(getSubscriptionPrimaryHref(value)).toBe('/spokedu-master/subscription');
  });

  it('maps active Center subscriptions for display', () => {
    const value = summary({ plan: 'team', status: 'active', periodEnd: future });

    expect(getSubscriptionPlanLabel(value)).toBe('센터·기관');
    expect(getSubscriptionStatusLabel(value)).toBe('구독 중');
    expect(getSubscriptionPrimaryHref(value)).toContain('mailto:spokedu77@gmail.com');
  });

  it('shows cancel_at_period_end as 해지 예정', () => {
    const value = summary({ plan: 'premium', status: 'active', periodEnd: future, cancelAtPeriodEnd: true });

    expect(getSubscriptionStatusLabel(value)).toBe('해지 예정');
    expect(getSubscriptionPrimaryLabel(value)).toBe('구독 관리');
  });

  it('shows expired paid subscriptions as ended', () => {
    const value = summary({ plan: 'premium', status: 'expired', periodEnd: past });

    expect(getSubscriptionStatusLabel(value)).toBe('이용 종료');
    expect(getSubscriptionPrimaryLabel(value)).toBe('이용권 선택');
  });

  it('maps legacy pro plan as 프리미엄', () => {
    const value = summary({ plan: 'pro', status: 'active', periodEnd: future });

    expect(getSubscriptionPlanLabel(value)).toBe('프리미엄');
    expect(getSubscriptionStatusLabel(value)).toBe('구독 중');
  });

  it('shows free users without trial as no subscription', () => {
    const value = summary({ plan: 'free', status: 'none' });

    expect(getSubscriptionPlanLabel(value)).toBe('없음');
    expect(getSubscriptionStatusLabel(value)).toBe('이용권 없음');
    expect(getSubscriptionPrimaryHref(value)).toBe('/spokedu-master/payment');
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
    });
    expect(getSubscriptionStatusLabel(value)).toBe('체험 중');
  });

  it('normalizes lite and premium plans', () => {
    const lite = normalizeSubscriptionSummary({ plan: 'lite', status: 'active', cancelAtPeriodEnd: true, nextBillingAt: future });
    expect(lite.plan).toBe('lite');
    expect(lite.cancelAtPeriodEnd).toBe(true);
    expect(lite.nextBillingAt).toBe(future);

    const premium = normalizeSubscriptionSummary({ plan: 'premium', status: 'active' });
    expect(premium.plan).toBe('premium');
    expect(premium.cancelAtPeriodEnd).toBe(false);
  });

  it('formats Korean end dates and handles missing values', () => {
    expect(formatSubscriptionEndDate(null)).toBe('종료일 없음');
    expect(formatSubscriptionEndDate('not-a-date')).toBe('종료일 확인 필요');
    expect(formatSubscriptionEndDate('2026-06-23T00:00:00.000Z')).toContain('2026');
  });
});
