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

describe('SPOKEDU MASTER checkout product boundary', () => {
  it('keeps legacy paid plan compatibility while allowing direct purchase only for Pro', () => {
    expect(isSpokeduMasterPaidPlan('pro')).toBe(true);
    expect(isSpokeduMasterPaidPlan('team')).toBe(true);
    expect(isSpokeduMasterDirectPurchasePlan('pro')).toBe(true);
    expect(isSpokeduMasterDirectPurchasePlan('team')).toBe(false);
    expect(SPOKEDU_MASTER_PLAN_CONFIG.pro.amount).toBe(39900);
  });

  it('checks direct purchase eligibility before creating a Toss order', () => {
    const directPlanCheck = route.indexOf('isSpokeduMasterDirectPurchasePlan(planKey)');
    const orderId = route.indexOf('createSpokeduMasterOrderId(planKey)');
    const upsert = route.indexOf(".from('spokedu_master_payment_orders')");
    expect(directPlanCheck).toBeGreaterThan(-1);
    expect(orderId).toBeGreaterThan(directPlanCheck);
    expect(upsert).toBeGreaterThan(directPlanCheck);
  });
});
