import { createSpokeduMasterOrderId, type SpokeduMasterPaidPlan } from './spokeduMasterPayment';

const TOSS_API_BASE = 'https://api.tosspayments.com/v1';

export type TossBillingIssueResult = {
  billingKey: string;
  customerKey: string;
};

export type TossBillingPaymentResult = {
  paymentKey: string;
  orderId: string;
  totalAmount: number;
  approvedAt: string | null;
};

function getTossSecretKey(): string | null {
  const secretKey = process.env.TOSS_SECRET_KEY?.trim();
  if (!secretKey) return null;
  if (!secretKey.startsWith('test_')) return null;
  return secretKey;
}

function tossAuthorization(secretKey: string): string {
  return `Basic ${Buffer.from(`${secretKey}:`).toString('base64')}`;
}

function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function readNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function isSpokeduMasterBillingProviderConfigured(): boolean {
  return Boolean(getTossSecretKey());
}

export async function issueSpokeduMasterBillingKey(input: {
  authKey: string;
  customerKey: string;
}): Promise<TossBillingIssueResult | null> {
  const secretKey = getTossSecretKey();
  if (!secretKey) return null;

  const response = await fetch(`${TOSS_API_BASE}/billing/authorizations/issue`, {
    method: 'POST',
    headers: {
      Authorization: tossAuthorization(secretKey),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      authKey: input.authKey,
      customerKey: input.customerKey,
    }),
    cache: 'no-store',
  });

  if (!response.ok) return null;
  const json = readRecord(await response.json());
  const billingKey = readString(json.billingKey);
  const customerKey = readString(json.customerKey) ?? input.customerKey;
  if (!billingKey) return null;
  return { billingKey, customerKey };
}

export async function paySpokeduMasterBillingKey(input: {
  billingKey: string;
  customerKey: string;
  plan: SpokeduMasterPaidPlan;
  amount: number;
  orderId?: string;
  orderName: string;
  customerEmail: string;
}): Promise<TossBillingPaymentResult | null> {
  const secretKey = getTossSecretKey();
  if (!secretKey) return null;

  const orderId = input.orderId ?? createSpokeduMasterOrderId(input.plan, 'initial');
  const response = await fetch(`${TOSS_API_BASE}/billing/${encodeURIComponent(input.billingKey)}`, {
    method: 'POST',
    headers: {
      Authorization: tossAuthorization(secretKey),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      customerKey: input.customerKey,
      amount: input.amount,
      orderId,
      orderName: input.orderName,
      customerEmail: input.customerEmail,
      taxFreeAmount: 0,
    }),
    cache: 'no-store',
  });

  if (!response.ok) return null;
  const json = readRecord(await response.json());
  const paymentKey = readString(json.paymentKey);
  const returnedOrderId = readString(json.orderId);
  const totalAmount = readNumber(json.totalAmount);
  const approvedAt = readString(json.approvedAt);
  if (!paymentKey || returnedOrderId !== orderId || totalAmount !== input.amount) return null;
  return {
    paymentKey,
    orderId,
    totalAmount,
    approvedAt,
  };
}
