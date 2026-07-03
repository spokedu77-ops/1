import { MASTER_PRODUCT_CATALOG, buildMasterSupportMailto } from '../lib/productCatalog';

export type SubscriptionSummaryPlan = 'free' | 'lite' | 'premium' | 'pro' | 'team';

export type SubscriptionSummaryStatus =
  | 'none'
  | 'active'
  | 'expired'
  | 'cancelled'
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

export type SubscriptionDisplayState =
  | 'loading'
  | 'none'
  | 'active'
  | 'cancelScheduled'
  | 'ended'
  | 'managed';

export type SubscriptionDisplaySummary = {
  state: SubscriptionDisplayState;
  planLabel: string;
  statusLabel: string;
  primaryLabel: '구독 관리' | '이용권 선택' | null;
  primaryHref: '/spokedu-master/subscription' | '/spokedu-master/payment' | null;
  dateLabel: '다음 결제일' | '이용 종료일' | null;
  dateText: string | null;
  amountText: string | null;
  description: string;
  isDirectBillingPlan: boolean;
  canCancel: boolean;
  canUseSpomatMemberPrice: boolean;
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
  if (summary?.isAdmin) return '관리자 권한';
  if (summary?.plan === 'team') return '센터·기관';
  if (summary?.plan === 'premium' || summary?.plan === 'pro') return '프리미엄';
  if (summary?.plan === 'lite') return '라이트';
  return '없음';
}

export function getSubscriptionStatusLabel(summary: SubscriptionSummaryData | null) {
  if (!summary) return '확인 중';
  if (summary.isAdmin || summary.plan === 'team') return '기관 관리';
  if (summary.status === 'expired' || summary.status === 'cancelled') return '이용 종료';
  if (summary.cancelAtPeriodEnd) return '해지 예정';
  if (summary.status === 'active' && (summary.plan === 'lite' || summary.plan === 'premium' || summary.plan === 'pro')) {
    return '이용 중';
  }
  return '이용권 없음';
}

export function formatSubscriptionEndDate(value: string | null) {
  if (!value) return '종료일 없음';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '이용 기간 확인 중';
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date).replace(/\s/g, '');
}

export function getSubscriptionPrimaryHref(summary: SubscriptionSummaryData | null) {
  const display = getSubscriptionDisplaySummary(summary);
  if (display.primaryHref) return display.primaryHref;
  return buildMasterSupportMailto('SPOKEDU MASTER 센터·기관 이용권 문의');
}

export function getSubscriptionPrimaryLabel(summary: SubscriptionSummaryData | null) {
  return getSubscriptionDisplaySummary(summary).primaryLabel ?? '구독 관리';
}

function getAmountText(plan: SubscriptionSummaryPlan) {
  if (plan === 'lite') return `월 ${MASTER_PRODUCT_CATALOG.lite.monthlyPriceKrw?.toLocaleString('ko-KR')}원`;
  if (plan === 'premium' || plan === 'pro') return `월 ${MASTER_PRODUCT_CATALOG.premium.monthlyPriceKrw?.toLocaleString('ko-KR')}원`;
  return null;
}

function getPeriodEnd(summary: SubscriptionSummaryData) {
  return summary.currentPeriodEnd ?? summary.periodEnd;
}

export function getSubscriptionDisplaySummary(summary: SubscriptionSummaryData | null): SubscriptionDisplaySummary {
  if (!summary) {
    return {
      state: 'loading',
      planLabel: '확인 중',
      statusLabel: '확인 중',
      primaryLabel: null,
      primaryHref: null,
      dateLabel: null,
      dateText: null,
      amountText: null,
      description: '이용권 정보를 확인하고 있습니다.',
      isDirectBillingPlan: false,
      canCancel: false,
      canUseSpomatMemberPrice: false,
    };
  }

  const planLabel = getSubscriptionPlanLabel(summary);

  if (summary.isAdmin || summary.plan === 'team') {
    return {
      state: 'managed',
      planLabel,
      statusLabel: summary.isAdmin ? '관리자 권한' : '센터·기관 이용권',
      primaryLabel: null,
      primaryHref: null,
      dateLabel: null,
      dateText: null,
      amountText: null,
      description: '관리자 또는 기관에서 관리하는 이용권입니다.',
      isDirectBillingPlan: false,
      canCancel: false,
      canUseSpomatMemberPrice: false,
    };
  }

  if (summary.status === 'active' && (summary.plan === 'lite' || summary.plan === 'premium' || summary.plan === 'pro')) {
    const endDate = formatSubscriptionEndDate(getPeriodEnd(summary));

    if (summary.cancelAtPeriodEnd) {
      return {
        state: 'cancelScheduled',
        planLabel,
        statusLabel: '해지 예정',
        primaryLabel: '구독 관리',
        primaryHref: '/spokedu-master/subscription',
        dateLabel: '이용 종료일',
        dateText: endDate,
        amountText: getAmountText(summary.plan),
        description: `${endDate}까지 이용할 수 있으며 이후 자동결제되지 않습니다.`,
        isDirectBillingPlan: true,
        canCancel: false,
        canUseSpomatMemberPrice: summary.plan === 'premium' || summary.plan === 'pro',
      };
    }

    return {
      state: 'active',
      planLabel,
      statusLabel: '이용 중',
      primaryLabel: '구독 관리',
      primaryHref: '/spokedu-master/subscription',
      dateLabel: '다음 결제일',
      dateText: formatSubscriptionEndDate(summary.nextBillingAt),
      amountText: getAmountText(summary.plan),
      description: '매월 최초 결제일에 자동 결제됩니다.',
      isDirectBillingPlan: true,
      canCancel: summary.plan === 'lite' || summary.plan === 'premium',
      canUseSpomatMemberPrice: summary.plan === 'premium' || summary.plan === 'pro',
    };
  }

  if (summary.status === 'expired' || summary.status === 'cancelled') {
    return {
      state: 'ended',
      planLabel: planLabel === '없음' ? '이용권' : planLabel,
      statusLabel: '이용 종료',
      primaryLabel: '이용권 선택',
      primaryHref: '/spokedu-master/payment',
      dateLabel: '이용 종료일',
      dateText: formatSubscriptionEndDate(getPeriodEnd(summary)),
      amountText: getAmountText(summary.plan),
      description: '이용권이 종료되었습니다.',
      isDirectBillingPlan: false,
      canCancel: false,
      canUseSpomatMemberPrice: false,
    };
  }

  return {
    state: 'none',
    planLabel: '없음',
    statusLabel: '이용권 없음',
    primaryLabel: '이용권 선택',
    primaryHref: '/spokedu-master/payment',
    dateLabel: null,
    dateText: null,
    amountText: null,
    description: '현재 이용 중인 이용권이 없습니다.',
    isDirectBillingPlan: false,
    canCancel: false,
    canUseSpomatMemberPrice: false,
  };
}
