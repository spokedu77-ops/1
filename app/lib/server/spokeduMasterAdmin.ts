import {
  evaluateSpokeduMasterEffectiveEntitlement,
  evaluateSpokeduMasterEntitlement,
  type SpokeduMasterEntitlementGrantRow,
  type SpokeduMasterSubscriptionRow,
} from '@/app/lib/server/spokeduMasterAccess';

export type MasterAdminPlan = 'free' | 'lite' | 'premium' | 'team';

export type MasterAdminPaymentOrderEvidence = {
  plan?: string | null;
  amount?: number | null;
  status?: string | null;
  updatedAt?: string | null;
  appliedAt?: string | null;
  lastErrorCode?: string | null;
  paymentApproved?: boolean;
};

export type MasterAdminBillingIncident = {
  code: 'normal' | 'cancel_scheduled' | 'renewal_pending' | 'renewal_failed' | 'retry_scheduled' | 'charged_apply_failed' | 'billing_setup_missing' | 'review_required';
  label: '정상' | '해지 예약' | '갱신 대기' | '갱신 실패' | '재시도 예정' | '결제 승인 / 이용권 반영 실패' | '결제 설정 누락' | '확인 필요';
  tone: 'ok' | 'warning' | 'danger';
};

const BILLING_SETUP_ERROR_CODES = new Set([
  'billing_auth_key_missing',
  'billing_key_issue_failed',
  'billing_key_store_failed',
  'billing_key_read_failed',
  'billing_key_missing_after_charge',
]);

export function deriveMasterAdminBillingIncident(input: {
  subscription: {
    status?: string | null;
    cancelAtPeriodEnd?: boolean;
    nextBillingAt?: string | null;
    renewalRetryCount?: number | null;
    lastBillingError?: string | null;
    nextRetryAt?: string | null;
  } | null;
  order: MasterAdminPaymentOrderEvidence | null;
}): MasterAdminBillingIncident {
  const { subscription, order } = input;
  if (order?.status === 'recoverable_failed' && order.paymentApproved) {
    return { code: 'charged_apply_failed', label: '결제 승인 / 이용권 반영 실패', tone: 'danger' };
  }
  if (order?.lastErrorCode && BILLING_SETUP_ERROR_CODES.has(order.lastErrorCode)) {
    return { code: 'billing_setup_missing', label: '결제 설정 누락', tone: 'danger' };
  }
  if (subscription?.lastBillingError && subscription.nextRetryAt) {
    return { code: 'retry_scheduled', label: '재시도 예정', tone: 'warning' };
  }
  if (subscription?.lastBillingError || (subscription?.renewalRetryCount ?? 0) > 0) {
    return { code: 'renewal_failed', label: '갱신 실패', tone: 'danger' };
  }
  if (subscription?.cancelAtPeriodEnd) {
    return { code: 'cancel_scheduled', label: '해지 예약', tone: 'warning' };
  }
  if (subscription?.status === 'pending') {
    return { code: 'renewal_pending', label: '갱신 대기', tone: 'warning' };
  }
  if (order && ['pending', 'processing', 'recoverable_failed', 'failed'].includes(order.status ?? '')) {
    return { code: 'review_required', label: '확인 필요', tone: 'warning' };
  }
  return { code: 'normal', label: '정상', tone: 'ok' };
}

export function buildMasterAdminAccess(input: {
  subscription: SpokeduMasterSubscriptionRow | null;
  grant: SpokeduMasterEntitlementGrantRow | null;
  now?: number;
}) {
  const now = input.now ?? Date.now();
  const paid = evaluateSpokeduMasterEntitlement(input.subscription, now);
  const effective = evaluateSpokeduMasterEffectiveEntitlement(input.subscription, input.grant, now);
  return {
    paidPlan: paid.allowed ? paid.plan : 'free',
    paidStatus: input.subscription?.status ?? 'none',
    effectivePlan: effective.allowed ? effective.plan : 'free',
    effectiveSource: effective.source,
    promoPlan: input.grant?.plan ?? null,
    promoStartsAt: input.grant?.starts_at ?? null,
    promoEndsAt: input.grant?.ends_at ?? null,
    fallbackPlan: paid.allowed ? paid.plan : 'free',
  };
}

export function grantStatus(grant: { starts_at: string; ends_at: string; revoked_at?: string | null }, now = Date.now()) {
  if (grant.revoked_at) return 'revoked' as const;
  if (Date.parse(grant.starts_at) > now) return 'scheduled' as const;
  if (Date.parse(grant.ends_at) <= now) return 'expired' as const;
  return 'active' as const;
}

export function calculateGrantExtensionEnd(endsAt: string, days: number): string | null {
  const currentEnd = Date.parse(endsAt);
  if (!Number.isFinite(currentEnd) || !Number.isInteger(days) || days < 1 || days > 366) return null;
  return new Date(currentEnd + days * 86_400_000).toISOString();
}
