import { buildMasterSupportMailto } from '../lib/productCatalog';

export type SubscriptionSummaryPlan = 'free' | 'lite' | 'premium' | 'pro' | 'team';

export type SubscriptionSummaryStatus =
  | 'none'
  | 'active'
  | 'expired'
  | 'cancelled'
  | 'trialing'
  | string;

export type SubscriptionSummaryData = {
  plan: SubscriptionSummaryPlan;
  status: SubscriptionSummaryStatus;
  periodEnd: string | null;
  currentPeriodEnd: string | null;
  nextBillingAt: string | null;
  cancelAtPeriodEnd: boolean;
  trialEndsAt: string | null;
  isAdmin: boolean;
};

export function normalizeSubscriptionSummary(value: unknown): SubscriptionSummaryData {
  const input = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const rawPlan = input.plan;
  const rawStatus = input.status;

  const plan: SubscriptionSummaryPlan =
    rawPlan === 'team' || rawPlan === 'pro' || rawPlan === 'lite' || rawPlan === 'premium'
      ? rawPlan
      : 'free';

  return {
    plan,
    status: typeof rawStatus === 'string' ? rawStatus : 'none',
    periodEnd: typeof input.periodEnd === 'string' ? input.periodEnd : null,
    currentPeriodEnd: typeof input.currentPeriodEnd === 'string' ? input.currentPeriodEnd : null,
    nextBillingAt: typeof input.nextBillingAt === 'string' ? input.nextBillingAt : null,
    cancelAtPeriodEnd: input.cancelAtPeriodEnd === true,
    trialEndsAt: typeof input.trialEndsAt === 'string' ? input.trialEndsAt : null,
    isAdmin: input.isAdmin === true,
  };
}

export function getSubscriptionPlanLabel(summary: SubscriptionSummaryData | null) {
  if (summary?.isAdmin || summary?.plan === 'team') return '센터·기관';
  if (summary?.plan === 'premium' || summary?.plan === 'pro') return '프리미엄';
  if (summary?.plan === 'lite') return '라이트';
  return '없음';
}

export function getSubscriptionStatusLabel(summary: SubscriptionSummaryData | null) {
  if (!summary) return '확인 중';
  if (summary.isAdmin) return '구독 중';
  if (summary.status === 'expired' || summary.status === 'cancelled') return '이용 종료';
  if (summary.cancelAtPeriodEnd) return '해지 예정';
  if (
    summary.plan === 'lite' ||
    summary.plan === 'premium' ||
    summary.plan === 'pro' ||
    summary.plan === 'team'
  ) {
    return summary.status === 'active' ? '구독 중' : '이용 종료';
  }
  if (summary.trialEndsAt && new Date(summary.trialEndsAt).getTime() > Date.now()) return '체험 중';
  return '이용권 없음';
}

export function formatSubscriptionEndDate(value: string | null) {
  if (!value) return '종료일 없음';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '종료일 확인 필요';
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

export function getSubscriptionPrimaryHref(summary: SubscriptionSummaryData | null) {
  if (!summary) return '/spokedu-master/subscription';
  if (summary.plan === 'team' || summary.isAdmin) return buildMasterSupportMailto('SPOKEDU MASTER Center 도입 상담');
  if (summary.plan === 'lite' || summary.plan === 'premium' || summary.plan === 'pro') {
    return '/spokedu-master/subscription';
  }
  return '/spokedu-master/payment';
}

export function getSubscriptionPrimaryLabel(summary: SubscriptionSummaryData | null) {
  const statusLabel = getSubscriptionStatusLabel(summary);
  if (statusLabel === '구독 중' || statusLabel === '해지 예정') return '구독 관리';
  if (summary?.plan === 'team' || summary?.isAdmin) return 'Center 도입 상담';
  if (statusLabel === '체험 중') return '이용권 선택';
  return '이용권 선택';
}
