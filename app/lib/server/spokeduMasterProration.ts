import { SPOKEDU_MASTER_PLAN_CONFIG } from './spokeduMasterPayment';

export const SPOKEDU_MASTER_LITE_PREMIUM_MONTHLY_DIFFERENCE =
  SPOKEDU_MASTER_PLAN_CONFIG.premium.amount - SPOKEDU_MASTER_PLAN_CONFIG.lite.amount;

export type SpokeduMasterUpgradeQuote = {
  amountDueNow: number;
  nextBillingAt: string;
  nextBillingAmount: number;
  periodStart: string;
  periodEnd: string;
};

export function calculateSpokeduMasterLiteUpgradeQuote(input: {
  periodStart: string;
  periodEnd: string;
  now?: Date;
}): SpokeduMasterUpgradeQuote | null {
  const startMs = Date.parse(input.periodStart);
  const endMs = Date.parse(input.periodEnd);
  const nowMs = (input.now ?? new Date()).getTime();
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs || nowMs < startMs || nowMs >= endMs) return null;
  const remainingRatio = (endMs - nowMs) / (endMs - startMs);
  const amountDueNow = Math.max(1, Math.min(
    SPOKEDU_MASTER_LITE_PREMIUM_MONTHLY_DIFFERENCE,
    Math.ceil(SPOKEDU_MASTER_LITE_PREMIUM_MONTHLY_DIFFERENCE * remainingRatio),
  ));
  return {
    amountDueNow,
    nextBillingAt: new Date(endMs).toISOString(),
    nextBillingAmount: SPOKEDU_MASTER_PLAN_CONFIG.premium.amount,
    periodStart: new Date(startMs).toISOString(),
    periodEnd: new Date(endMs).toISOString(),
  };
}