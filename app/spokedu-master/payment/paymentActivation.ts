import { hasMasterEntitlement, type MasterAccessSnapshot } from '../lib/masterAccessModel';

export type BillingActivationSummary = {
  hasPaidBillingSubscription?: boolean;
  billingPlan?: string | null;
  billingStatus?: string;
  billingPeriodEnd?: string | null;
  nextBillingAt?: string | null;
};

export function isPaidPaymentActivated(
  access: (Partial<MasterAccessSnapshot> & { allowed?: boolean }) | null,
  billing: BillingActivationSummary | null,
  plan: 'lite' | 'premium',
  now = Date.now(),
): boolean {
  if (!access || !billing || access.allowed !== true || access.authenticated !== true || access.isAdmin) return false;
  if (!billing.hasPaidBillingSubscription || billing.billingStatus !== 'active' || billing.billingPlan !== plan) return false;
  if (!billing.billingPeriodEnd || !(Date.parse(billing.billingPeriodEnd) > now)) return false;
  // A separate Premium gift must not hide a successfully paid Lite subscription.
  if (access.plan !== plan && !(plan === 'lite' && access.plan === 'premium')) return false;
  return hasMasterEntitlement(access as MasterAccessSnapshot);
}
