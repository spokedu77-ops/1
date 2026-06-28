import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(
  join(process.cwd(), 'app/api/spokedu-master/payment/confirm/route.ts'),
  'utf8',
);

describe('SPOKEDU MASTER confirm ownership contract', () => {
  it('loads the current user order before calling Toss', () => {
    const lookup = source.indexOf(".from('spokedu_master_payment_orders')");
    const ownerFilter = source.indexOf(".eq('user_id', user.id)", lookup);
    const tossCall = source.indexOf("fetch('https://api.tosspayments.com/v1/payments/confirm'");
    expect(lookup).toBeGreaterThan(-1);
    expect(ownerFilter).toBeGreaterThan(lookup);
    expect(tossCall).toBeGreaterThan(ownerFilter);
  });

  it('returns 404 for an unavailable owner-scoped order', () => {
    expect(source).toContain("if (!order)");
    expect(source).toContain("{ status: 404 }");
  });

  it('delegates idempotent activation to the single payment application helper', () => {
    expect(source).toContain('applySpokeduMasterPayment({');
    expect(source).toContain('userId: user.id');
    expect(source).toContain('orderId: body.orderId');
    expect(source).toContain('paymentKey: body.paymentKey');
    expect(source).toContain(".eq('user_id', user.id)");
    expect(source).toContain("source: 'confirm'");
  });

  it('does not update subscription or order rows directly after Toss confirmation', () => {
    const tossCall = source.indexOf("fetch('https://api.tosspayments.com/v1/payments/confirm'");
    expect(source.indexOf(".from('spokedu_master_subscriptions')", tossCall)).toBe(-1);
    expect(source.indexOf('.update({', tossCall)).toBe(-1);
  });
});
