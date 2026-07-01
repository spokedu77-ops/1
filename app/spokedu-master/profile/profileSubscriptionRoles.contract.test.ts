import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

describe('profile and subscription role separation', () => {
  const profile = read('app/spokedu-master/profile/page.tsx');
  const subscription = read('app/spokedu-master/subscription/page.tsx');
  const summary = read('app/spokedu-master/profile/subscriptionSummary.ts');

  it('keeps profile as account, summary, support menu, and logout hub', () => {
    expect(profile).toContain('계정 정보');
    expect(profile).toContain('SubscriptionSummaryCard');
    expect(profile).toContain('구독 관리');
    expect(profile).toContain('/spokedu-master/shop');
    expect(profile).toContain('이용약관');
    expect(profile).toContain('개인정보처리방침');
    expect(profile).toContain('handleLogout');
  });

  it('removes plan selection and duplicate commercial CTAs from profile', () => {
    expect(profile).not.toContain('PlanSheet');
    expect(profile).not.toContain('PlanCard');
    expect(profile).not.toContain('PLANS');
    expect(profile).not.toContain('/spokedu-master/payment?plan=');
    expect(profile).not.toContain('SPOMOVE');
    expect(profile).not.toContain('getTrialDaysLeft');
  });

  it('keeps subscription focused on current plan, dates, cancellation, and payment selection', () => {
    expect(subscription).toContain('현재 이용권');
    expect(subscription).toContain('월 결제 금액');
    expect(subscription).toContain('다음 결제일');
    expect(subscription).toContain('이용 종료일');
    expect(subscription).toContain('구독 해지');
    expect(subscription).toContain('/spokedu-master/payment');
  });

  it('does not add auxiliary navigation to the subscription management screen', () => {
    expect(subscription).not.toContain('/spokedu-master/shop');
    expect(subscription).not.toContain('/spokedu-master/spomove');
    expect(subscription).not.toContain('SPOMAT 스토어');
    expect(subscription).not.toContain('센터·기관 문의');
  });

  it('centralizes display state in the summary helper', () => {
    expect(summary).toContain('getSubscriptionDisplaySummary');
    expect(profile).toContain('getSubscriptionDisplaySummary(subscriptionSummary)');
    expect(subscription).toContain('getSubscriptionDisplaySummary(data)');
  });
});
