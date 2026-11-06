import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { isSpokeduMasterPaidPlan, type SpokeduMasterPaidPlan } from './spokeduMasterPayment';

export const BILLING_INTENT_COOKIE = 'spokedu_billing_intent';
export const BILLING_INTENT_MAX_AGE = 30 * 60;
type Intent = { userId: string; plan: SpokeduMasterPaidPlan; customerKey: string; expires: number; nonce: string };

function sign(payload: string): string {
  const secret = process.env.TOSS_SECRET_KEY?.trim();
  if (!secret) throw new Error('billing_intent_configuration_missing');
  return createHmac('sha256', secret).update(`spokedu-billing-intent-v1:${payload}`).digest('base64url');
}

export function createBillingIntent(input: Pick<Intent, 'userId' | 'plan' | 'customerKey'>): string {
  const payload = Buffer.from(JSON.stringify({ ...input, expires: Date.now() + BILLING_INTENT_MAX_AGE * 1000, nonce: randomUUID() })).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

export function verifyBillingIntent(token: string | undefined, input: Pick<Intent, 'userId' | 'plan' | 'customerKey'>): boolean {
  if (!token || token.length > 2048) return false;
  try {
    const [payload, signature, extra] = token.split('.');
    if (!payload || !signature || extra) return false;
    const expected = Buffer.from(sign(payload));
    const received = Buffer.from(signature);
    if (expected.length !== received.length || !timingSafeEqual(expected, received)) return false;
    const intent = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as Intent;
    return isSpokeduMasterPaidPlan(intent.plan) && intent.userId === input.userId && intent.plan === input.plan
      && intent.customerKey === input.customerKey && intent.expires > Date.now()
      && intent.expires <= Date.now() + BILLING_INTENT_MAX_AGE * 1000;
  } catch { return false; }
}
