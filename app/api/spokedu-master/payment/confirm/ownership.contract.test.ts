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
    expect(source).toContain("return NextResponse.json({ error: 'Payment order not found' }, { status: 404 })");
  });

  it('limits idempotency to the same order, payment key, plan, user, and active period', () => {
    expect(source).toContain('data.toss_order_id !== body.orderId');
    expect(source).toContain('data.toss_payment_key !== body.paymentKey');
    expect(source).toContain('data.plan !== plan');
    expect(source).toContain(".eq('user_id', user.id)");
    expect(source).toContain('periodEndMs <= Date.now()');
  });

  it('updates only the current user order after subscription activation', () => {
    const update = source.lastIndexOf(".from('spokedu_master_payment_orders')");
    expect(source.indexOf(".eq('user_id', user.id)", update)).toBeGreaterThan(update);
  });
});
