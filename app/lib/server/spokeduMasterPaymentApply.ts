import { hashForMonitoring, reportError } from '@/app/lib/monitoring/errorReporter';
import { getServiceSupabase } from '@/app/lib/server/adminAuth';

import {
  SPOKEDU_MASTER_PLAN_CONFIG,
  isSpokeduMasterPaidPlan,
  parseSpokeduMasterOrderId,
  type SpokeduMasterPaidPlan,
} from './spokeduMasterPayment';

export type SpokeduMasterPaymentSource =
  | 'initial'
  | 'renewal'
  | 'webhook'
  | 'cancel'
  | 'partial_cancel_review_required';

export type ApplySpokeduMasterPaymentInput = {
  userId: string;
  orderId: string;
  paymentKey: string;
  plan: SpokeduMasterPaidPlan;
  amount: number;
  approvedAt?: string | null;
  eventKey: string;
  source: SpokeduMasterPaymentSource;
  providerCustomerKey?: string | null;
  providerBillingKeySecretId?: string | null;
  billingCycleKey?: string | null;
};

export type ApplySpokeduMasterPaymentResult =
  | {
      ok: true;
      alreadyApplied: boolean;
      plan: SpokeduMasterPaidPlan;
      periodEnd: string | null;
      nextBillingAt?: string | null;
      cancelled?: boolean;
      ignored?: boolean;
      reason?: string;
    }
  | {
      ok: false;
      status: 400 | 404 | 409 | 500;
      code: string;
      message: string;
    };

function parsePeriodStart(approvedAt?: string | null) {
  if (approvedAt) {
    const parsed = Date.parse(approvedAt);
    if (Number.isFinite(parsed)) return new Date(parsed);
  }
  return new Date();
}

function daysInUtcMonth(year: number, monthIndex: number): number {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

export function addOneBillingMonth(date: Date): Date {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const targetMonth = month + 1;
  const targetYear = year + Math.floor(targetMonth / 12);
  const normalizedTargetMonth = targetMonth % 12;
  const day = Math.min(date.getUTCDate(), daysInUtcMonth(targetYear, normalizedTargetMonth));
  return new Date(Date.UTC(
    targetYear,
    normalizedTargetMonth,
    day,
    date.getUTCHours(),
    date.getUTCMinutes(),
    date.getUTCSeconds(),
    date.getUTCMilliseconds(),
  ));
}

export function calculateSpokeduMasterPaymentPeriod(approvedAt?: string | null) {
  const periodStart = parsePeriodStart(approvedAt);
  const periodEnd = addOneBillingMonth(periodStart);
  return {
    periodStart: periodStart.toISOString(),
    periodEnd: periodEnd.toISOString(),
    nextBillingAt: periodEnd.toISOString(),
  };
}

function reject(status: 400 | 404 | 409 | 500, code: string, message: string): ApplySpokeduMasterPaymentResult {
  return { ok: false, status, code, message };
}

function mapRpcReason(reason: string | null | undefined): ApplySpokeduMasterPaymentResult {
  if (reason === 'order_not_found') return reject(404, reason, 'Payment order not found');
  if (reason === 'order_owner_mismatch') return reject(404, reason, 'Payment order not found');
  if (reason === 'plan_mismatch' || reason === 'invalid_plan') return reject(400, reason, 'Invalid order plan');
  if (reason === 'amount_mismatch') return reject(400, reason, 'Invalid order amount');
  if (reason === 'invalid_period') return reject(400, reason, 'Invalid payment period');
  if (reason === 'payment_key_conflict' || reason === 'unique_conflict' || reason === 'active_order_without_subscription' || reason === 'billing_cycle_already_processed') {
    return reject(409, reason, 'Payment order already confirmed');
  }
  return reject(500, reason ?? 'payment_apply_failed', 'Payment activation failed');
}

export function validateSpokeduMasterPaymentApplyInput(input: ApplySpokeduMasterPaymentInput): ApplySpokeduMasterPaymentResult | null {
  if (!isSpokeduMasterPaidPlan(input.plan)) return reject(400, 'invalid_plan', 'Invalid order plan');
  if (parseSpokeduMasterOrderId(input.orderId) !== input.plan) return reject(400, 'plan_mismatch', 'Invalid order plan');
  if (!Number.isInteger(input.amount) || input.amount !== SPOKEDU_MASTER_PLAN_CONFIG[input.plan].amount) {
    return reject(400, 'amount_mismatch', 'Invalid order amount');
  }
  if (!input.userId || !input.orderId || !input.paymentKey || !input.eventKey) {
    return reject(400, 'missing_payment_input', 'Missing payment input');
  }
  return null;
}

export async function applySpokeduMasterPayment(
  input: ApplySpokeduMasterPaymentInput,
): Promise<ApplySpokeduMasterPaymentResult> {
  const validation = validateSpokeduMasterPaymentApplyInput(input);
  if (validation) return validation;

  const { periodStart, periodEnd, nextBillingAt } = calculateSpokeduMasterPaymentPeriod(input.approvedAt);
  const service = getServiceSupabase();

  const { data, error } = await service.rpc('spokedu_master_apply_payment', {
    p_user_id: input.userId,
    p_order_id: input.orderId,
    p_payment_key: input.paymentKey,
    p_plan: input.plan,
    p_amount: input.amount,
    p_period_start: input.source === 'cancel' || input.source === 'partial_cancel_review_required' ? null : periodStart,
    p_period_end: input.source === 'cancel' || input.source === 'partial_cancel_review_required' ? null : periodEnd,
    p_next_billing_at: input.source === 'renewal' || input.source === 'initial' || input.source === 'webhook' ? nextBillingAt : null,
    p_event_key: input.eventKey,
    p_source: input.source,
    p_provider_customer_key: input.providerCustomerKey ?? null,
    p_provider_billing_key_secret_id: input.providerBillingKeySecretId ?? null,
    p_billing_cycle_key: input.billingCycleKey ?? null,
  });

  if (error) {
    await reportError(error, {
      context: 'spokedu_master.payment.apply',
      tags: {
        provider: 'tosspayments',
        stage: 'rpc',
        source: input.source,
        plan: input.plan,
        status: 500,
        paymentHash: hashForMonitoring(input.paymentKey),
        orderHash: hashForMonitoring(input.orderId),
      },
    });
    return reject(500, 'payment_apply_rpc_failed', 'Payment activation failed');
  }

  const result = data as {
    status?: string;
    alreadyApplied?: boolean;
    periodEnd?: string | null;
    nextBillingAt?: string | null;
    cancelled?: boolean;
    reason?: string;
  } | null;

  if (result?.status === 'processed') {
    return {
      ok: true,
      alreadyApplied: Boolean(result.alreadyApplied),
      plan: input.plan,
      periodEnd: result.periodEnd ?? null,
      nextBillingAt: result.nextBillingAt ?? null,
      cancelled: result.cancelled,
    };
  }

  if (result?.status === 'ignored') {
    return {
      ok: true,
      alreadyApplied: true,
      plan: input.plan,
      periodEnd: null,
      ignored: true,
      reason: result.reason,
    };
  }

  return mapRpcReason(result?.reason);
}
