export const SPOKEDU_MASTER_PLAN_CONFIG = {
  lite: {
    name: 'SPOKEDU MASTER Lite',
    amount: 9900,
  },
  premium: {
    name: 'SPOKEDU MASTER Premium',
    amount: 28900,
  },
} as const;

export type SpokeduMasterPaidPlan = keyof typeof SPOKEDU_MASTER_PLAN_CONFIG;
export type SpokeduMasterDirectPurchasePlan = SpokeduMasterPaidPlan;

export const SPOKEDU_MASTER_DIRECT_PURCHASE_PLANS = ['lite', 'premium'] as const;

export function isSpokeduMasterPaidPlan(value: unknown): value is SpokeduMasterPaidPlan {
  return value === 'lite' || value === 'premium';
}

export function isSpokeduMasterDirectPurchasePlan(value: unknown): value is SpokeduMasterDirectPurchasePlan {
  return isSpokeduMasterPaidPlan(value);
}

export function getSpokeduMasterPlanAmount(plan: SpokeduMasterPaidPlan): number {
  return SPOKEDU_MASTER_PLAN_CONFIG[plan].amount;
}

export function parseSpokeduMasterOrderId(orderId: unknown): SpokeduMasterPaidPlan | null {
  if (typeof orderId !== 'string') return null;
  const match = /^spm-(lite|premium)-(?:initial|renewal)-([0-9a-z-]+)$/i.exec(orderId);
  if (!match) return null;
  return match[1] as SpokeduMasterPaidPlan;
}

export function createSpokeduMasterOrderId(plan: SpokeduMasterPaidPlan, kind: 'initial' | 'renewal' = 'initial'): string {
  return `spm-${plan}-${kind}-${crypto.randomUUID()}`;
}

export function createSpokeduMasterRenewalOrderId(
  plan: SpokeduMasterPaidPlan,
  subscriptionId: string,
  billingCycleKey: string,
): string {
  return `spm-${plan}-renewal-${subscriptionId}-${billingCycleKey}`;
}

export type SpokeduMasterPaymentOrder = {
  order_id: string;
  user_id: string;
  plan: string;
  amount: number;
  status: string;
  payment_key: string | null;
};

export function validateSpokeduMasterPaymentOrder(
  order: SpokeduMasterPaymentOrder,
  input: {
    userId: string;
    orderId: string;
    paymentKey: string;
    plan: SpokeduMasterPaidPlan;
    amount: number;
  },
): { ok: true } | { ok: false; status: 400 | 404 | 409; error: string } {
  if (order.order_id !== input.orderId || order.user_id !== input.userId) {
    return { ok: false, status: 404, error: 'Payment order not found' };
  }
  if (order.plan !== input.plan || parseSpokeduMasterOrderId(order.order_id) !== input.plan) {
    return { ok: false, status: 400, error: 'Invalid order plan' };
  }
  if (
    order.amount !== input.amount ||
    order.amount !== SPOKEDU_MASTER_PLAN_CONFIG[input.plan].amount
  ) {
    return { ok: false, status: 400, error: 'Invalid order amount' };
  }
  if (order.status === 'active' && order.payment_key !== input.paymentKey) {
    return { ok: false, status: 409, error: 'Payment order already confirmed' };
  }
  if (order.status !== 'pending' && order.status !== 'active') {
    return { ok: false, status: 409, error: 'Payment order is not pending' };
  }
  return { ok: true };
}
