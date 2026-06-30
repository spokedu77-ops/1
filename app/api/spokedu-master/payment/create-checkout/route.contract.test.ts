import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  isSpokeduMasterDirectPurchasePlan,
  isSpokeduMasterPaidPlan,
  SPOKEDU_MASTER_PLAN_CONFIG,
} from '@/app/lib/server/spokeduMasterPayment';

const route = readFileSync(
  join(process.cwd(), 'app/api/spokedu-master/payment/create-checkout/route.ts'),
  'utf8',
);

describe('SPOKEDU MASTER legacy checkout boundary', () => {
  it('uses Lite and Premium as the only paid server plans', () => {
    expect(isSpokeduMasterPaidPlan('lite')).toBe(true);
    expect(isSpokeduMasterPaidPlan('premium')).toBe(true);
    expect(isSpokeduMasterPaidPlan('pro')).toBe(false);
    expect(isSpokeduMasterPaidPlan('team')).toBe(false);
    expect(isSpokeduMasterDirectPurchasePlan('center')).toBe(false);
    expect(SPOKEDU_MASTER_PLAN_CONFIG.lite.amount).toBe(9900);
    expect(SPOKEDU_MASTER_PLAN_CONFIG.premium.amount).toBe(28900);
  });

  it('does not create orders from the old one-time checkout route', () => {
    expect(route).toContain("body.plan === 'pro'");
    expect(route).toContain("body.plan === 'team'");
    expect(route).toContain('월 자동결제 등록 API');
    expect(route).not.toContain("spokedu_master_payment_orders");
    expect(route).not.toContain('createSpokeduMasterOrderId');
  });
});
