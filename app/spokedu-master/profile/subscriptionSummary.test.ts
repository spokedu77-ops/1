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
    trialEndsAt: null,
    isAdmin: false,
    ...overrides,
  };
}

describe('subscriptionSummary', () => {
  it('maps active Pro subscriptions for display', () => {
    const value = summary({ plan: 'pro', status: 'active', periodEnd: future });

    expect(getSubscriptionPlanLabel(value)).toBe('Pro');
    expect(getSubscriptionStatusLabel(value)).toBe('이용 중');
    expect(getSubscriptionPrimaryLabel(value)).toBe('이용권 변경');
    expect(getSubscriptionPrimaryHref(value)).toBe('/spokedu-master/payment?plan=pro');
  });

  it('maps active Center subscriptions for display', () => {
    const value = summary({ plan: 'team', status: 'active', periodEnd: future });

    expect(getSubscriptionPlanLabel(value)).toBe('Center');
    expect(getSubscriptionStatusLabel(value)).toBe('이용 중');
    expect(getSubscriptionPrimaryHref(value)).toContain('mailto:support@spokedu.com');
  });

  it('shows expired paid subscriptions as ended', () => {
    const value = summary({ plan: 'pro', status: 'expired', periodEnd: past });

    expect(getSubscriptionStatusLabel(value)).toBe('이용 종료');
    expect(getSubscriptionPrimaryLabel(value)).toBe('Pro 결제');
  });

  it('shows free users without trial as no subscription', () => {
    const value = summary({ plan: 'free', status: 'none' });

    expect(getSubscriptionPlanLabel(value)).toBe('Trial');
    expect(getSubscriptionStatusLabel(value)).toBe('이용권 없음');
    expect(getSubscriptionPrimaryHref(value)).toBe('/spokedu-master/payment?plan=pro');
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
      trialEndsAt: future,
      isAdmin: false,
    });
    expect(getSubscriptionStatusLabel(value)).toBe('체험 중');
  });

  it('formats Korean end dates and handles missing values', () => {
    expect(formatSubscriptionEndDate(null)).toBe('종료일 없음');
    expect(formatSubscriptionEndDate('not-a-date')).toBe('종료일 확인 필요');
    expect(formatSubscriptionEndDate('2026-06-23T00:00:00.000Z')).toContain('2026');
  });
});
