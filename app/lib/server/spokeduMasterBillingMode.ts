import {
  SPOKEDU_MASTER_PLAN_CONFIG,
  isSpokeduMasterPaidPlan,
  parseSpokeduMasterOrderId,
  type SpokeduMasterPaidPlan,
} from './spokeduMasterPayment';

export type SpokeduMasterBillingMode = 'initial' | 'upgrade' | 'renewal';

export const SPOKEDU_MASTER_MAX_UPGRADE_AMOUNT =
  SPOKEDU_MASTER_PLAN_CONFIG.premium.amount - SPOKEDU_MASTER_PLAN_CONFIG.lite.amount;

const UUID_RE = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const UPGRADE_CYCLE_RE = new RegExp(`^upgrade:(${UUID_RE}):premium:(.+)$`, 'i');
const INITIAL_CYCLE_RE = new RegExp(`^initial:(${UUID_RE}):(lite|premium)(?::\\d+)?$`, 'i');

export function classifySpokeduMasterBillingMode(input: {
  orderId: string;
  userId: string;
  plan: string;
  billingCycleKey?: string | null;
}): SpokeduMasterBillingMode | 'invalid' {
  if (!isSpokeduMasterPaidPlan(input.plan)) return 'invalid';
  if (parseSpokeduMasterOrderId(input.orderId) !== input.plan) return 'invalid';

  const cycle = input.billingCycleKey?.trim() ?? '';
  const upgradeMatch = UPGRADE_CYCLE_RE.exec(cycle);
  if (upgradeMatch) {
    if (upgradeMatch[1].toLowerCase() !== input.userId.toLowerCase()) return 'invalid';
    if (input.plan !== 'premium') return 'invalid';
    return 'upgrade';
  }

  if (input.orderId.includes('-renewal-')) return 'renewal';

  if (cycle) {
    const initialMatch = INITIAL_CYCLE_RE.exec(cycle);
    if (initialMatch && initialMatch[1].toLowerCase() !== input.userId.toLowerCase()) return 'invalid';
    if (initialMatch && initialMatch[2] !== input.plan) return 'invalid';
  }

  return 'initial';
}

export function validateSpokeduMasterChargedAmount(input: {
  mode: SpokeduMasterBillingMode;
  plan: SpokeduMasterPaidPlan;
  orderAmount: number;
  tossTotalAmount: number;
}): 'ok' | 'amount_mismatch' | 'invalid_upgrade_plan' {
  if (!Number.isInteger(input.orderAmount) || !Number.isInteger(input.tossTotalAmount)) {
    return 'amount_mismatch';
  }
  if (input.orderAmount !== input.tossTotalAmount) return 'amount_mismatch';
  if (input.mode === 'upgrade') {
    if (input.plan !== 'premium') return 'invalid_upgrade_plan';
    if (input.orderAmount <= 0 || input.orderAmount > SPOKEDU_MASTER_MAX_UPGRADE_AMOUNT) {
      return 'amount_mismatch';
    }
    return 'ok';
  }
  if (input.orderAmount !== SPOKEDU_MASTER_PLAN_CONFIG[input.plan].amount) return 'amount_mismatch';
  return 'ok';
}
