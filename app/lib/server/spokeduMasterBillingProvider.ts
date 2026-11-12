import { randomUUID } from 'node:crypto';
import { createSpokeduMasterOrderId, type SpokeduMasterPaidPlan } from './spokeduMasterPayment';
import { getBillingKeyFormatError, SPOKEDU_BILLING_MID } from './spokeduMasterBillingConfiguration';

const TOSS_API_BASE = 'https://api.tosspayments.com/v1';
export const TOSS_FETCH_TIMEOUT_MS = 8_000;
export const TOSS_BILLING_APPROVAL_TIMEOUT_MS = 70_000;

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

export function getTossSecretKey(): string | null {
  const secretKey = process.env.TOSS_SECRET_KEY?.trim();
  // Checkout attestation is enforced by /prepare. Do not make existing paid
  // renewals or webhook recovery depend on newly introduced checkout metadata.
  if (!secretKey || getBillingKeyFormatError()) return null;
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

async function providerFailure(response: Response, message: string): Promise<Error> {
  const failure = readRecord(await response.json().catch(() => null));
  const code = typeof failure.code === 'string' && /^[A-Z0-9_]{1,80}$/.test(failure.code)
    ? failure.code : 'BILLING_PROVIDER_HTTP_ERROR';
  return Object.assign(new Error(`${message}:${response.status}:${code}`), { code, providerStatus: response.status });
}

export function isSpokeduMasterBillingProviderConfigured(): boolean {
  return Boolean(getTossSecretKey());
}

/** Check the server's real egress policy before opening card auth. Never charges or writes orders. */
export async function assertSpokeduMasterBillingProviderAccess(): Promise<void> {
  if (!isSpokeduMasterBillingProviderConfigured()) {
    throw Object.assign(new Error('billing_provider_unconfigured'), { code: 'BILLING_PROVIDER_UNCONFIGURED' });
  }
  await findSpokeduMasterPaymentByOrderId({ orderId: `spm-readiness-${randomUUID()}`, amount: 0 });
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
    signal: AbortSignal.timeout(TOSS_FETCH_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw await providerFailure(response, 'toss_billing_key_issue_failed');
  }
  const json = readRecord(await response.json());
  const billingKey = readString(json.billingKey);
  const customerKey = readString(json.customerKey);
  if (!billingKey || customerKey !== input.customerKey || json.mId !== SPOKEDU_BILLING_MID) return null;
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
      'Idempotency-Key': orderId,
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
    signal: AbortSignal.timeout(TOSS_BILLING_APPROVAL_TIMEOUT_MS),
  });

  if (!response.ok) {
    if (response.status === 400 || response.status === 422) return null;
    throw await providerFailure(response, 'toss_billing_approval_indeterminate');
  }
  const json = readRecord(await response.json());
  const paymentKey = readString(json.paymentKey);
  const returnedOrderId = readString(json.orderId);
  const totalAmount = readNumber(json.totalAmount);
  const approvedAt = readString(json.approvedAt);
  if (!paymentKey || returnedOrderId !== orderId || totalAmount !== input.amount
    || json.status !== 'DONE' || json.mId !== SPOKEDU_BILLING_MID
    || !approvedAt || !Number.isFinite(Date.parse(approvedAt))) {
    throw new Error('toss_billing_approval_mismatch');
  }
  return {
    paymentKey,
    orderId,
    totalAmount,
    approvedAt,
  };
}

/** 동일 orderId로 이미 승인된 결제가 있으면 재청구 전에 회수한다. */
export async function findSpokeduMasterPaymentByOrderId(input: {
  orderId: string;
  amount: number;
}): Promise<TossBillingPaymentResult | null> {
  const secretKey = getTossSecretKey();
  if (!secretKey || !input.orderId) return null;

  const response = await fetch(
    `${TOSS_API_BASE}/payments/orders/${encodeURIComponent(input.orderId)}`,
    {
      method: 'GET',
      headers: {
        Authorization: tossAuthorization(secretKey),
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(TOSS_FETCH_TIMEOUT_MS),
    },
  );

  // A provider 404 is the only authoritative "not charged" result. Auth,
  // rate-limit, timeout, and provider failures are indeterminate and must not
  // be collapsed into null, because callers may otherwise charge again.
  if (response.status === 404) return null;
  if (!response.ok) {
    throw await providerFailure(response, 'toss_order_lookup_indeterminate');
  }
  const json = readRecord(await response.json());
  const paymentKey = readString(json.paymentKey);
  const returnedOrderId = readString(json.orderId);
  const totalAmount = readNumber(json.totalAmount);
  const approvedAt = readString(json.approvedAt);
  const status = readString(json.status);
  if (!paymentKey || returnedOrderId !== input.orderId || totalAmount !== input.amount || json.mId !== SPOKEDU_BILLING_MID) {
    throw new Error('toss_order_lookup_mismatch');
  }
  if (status !== 'DONE') return null;
  if (!approvedAt || !Number.isFinite(Date.parse(approvedAt))) {
    throw new Error('toss_order_lookup_approval_time_missing');
  }
  return {
    paymentKey,
    orderId: returnedOrderId,
    totalAmount,
    approvedAt,
  };
}
