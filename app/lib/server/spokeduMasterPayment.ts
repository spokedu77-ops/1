export const SPOKEDU_MASTER_PLAN_CONFIG = {
  pro: {
    name: 'SPOKEDU MASTER Pro 플랜',
    amount: 39900,
  },
  team: {
    name: 'SPOKEDU MASTER Center 플랜',
    amount: 79000,
  },
} as const;

export type SpokeduMasterPaidPlan = keyof typeof SPOKEDU_MASTER_PLAN_CONFIG;

export function isSpokeduMasterPaidPlan(value: unknown): value is SpokeduMasterPaidPlan {
  return value === 'pro' || value === 'team';
}

export function parseSpokeduMasterOrderId(orderId: unknown): SpokeduMasterPaidPlan | null {
  if (typeof orderId !== 'string') return null;
  const match = /^spm-(pro|team)-(\d{10,})$/.exec(orderId);
  if (!match) return null;
  return match[1] as SpokeduMasterPaidPlan;
}
