import { buildMasterSupportMailto } from '../lib/productCatalog';

export type SubscriptionSummaryPlan = 'free' | 'pro' | 'team';

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
  trialEndsAt: string | null;
  isAdmin: boolean;
};

export function normalizeSubscriptionSummary(value: unknown): SubscriptionSummaryData {
  const input = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const rawPlan = input.plan;
  const rawStatus = input.status;

  return {
    plan: rawPlan === 'team' || rawPlan === 'pro' ? rawPlan : 'free',
    status: typeof rawStatus === 'string' ? rawStatus : 'none',
    periodEnd: typeof input.periodEnd === 'string' ? input.periodEnd : null,
    trialEndsAt: typeof input.trialEndsAt === 'string' ? input.trialEndsAt : null,
    isAdmin: input.isAdmin === true,
  };
}

export function getSubscriptionPlanLabel(summary: SubscriptionSummaryData | null) {
  if (summary?.isAdmin) return 'Center';
  if (summary?.plan === 'team') return 'Center';
  if (summary?.plan === 'pro') return 'Pro';
  return 'Trial';
}

export function getSubscriptionStatusLabel(summary: SubscriptionSummaryData | null) {
  if (!summary) return '확인 중';
  if (summary.isAdmin) return '이용 중';
  if (summary.status === 'expired') return '이용 종료';
  if (summary.status === 'cancelled') {
    return summary.periodEnd && new Date(summary.periodEnd).getTime() > Date.now()
      ? '이용 중'
      : '이용 종료';
  }
  if (summary.plan === 'pro' || summary.plan === 'team') {
    return summary.status === 'active' ? '이용 중' : '이용 종료';
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
  if (!summary) return '/spokedu-master/profile?plans=1';
  if (summary.plan === 'team') return buildMasterSupportMailto('SPOKEDU MASTER Center 도입 상담');
  if (summary.plan === 'pro') return '/spokedu-master/payment?plan=pro';
  return '/spokedu-master/payment?plan=pro';
}

export function getSubscriptionPrimaryLabel(summary: SubscriptionSummaryData | null) {
  const status = getSubscriptionStatusLabel(summary);
  if (status === '이용 중' || status === '체험 중') return '이용권 변경';
  if (summary?.plan === 'team') return 'Center 도입 상담';
  return 'Pro 결제';
}
