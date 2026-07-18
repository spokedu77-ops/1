import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

function read(path: string) {
  return readFileSync(join(process.cwd(), path), 'utf8');
}

describe('SPOKEDU MASTER billing idempotency contracts', () => {
  it('claims orders before charging and stores vault keys only after a successful charge', () => {
    const source = read('app/api/spokedu-master/payment/billing/issue/route.ts');
    expect(source).toContain('billingCycleKey = `${billingMode}:${user.id}:${plan}`');
    expect(source).toContain('billingCycleKey = `${billingMode}:${user.id}:${plan}:${Date.now()}`');
    expect(source).not.toContain("billing_cycle_key: `${billingMode}:${orderId}`");
    expect(source).toContain('claimSpokeduMasterBillingOrder');
    expect(source).toContain('shouldReapplySpokeduMasterBillingOrder');
    expect(source).toContain('markSpokeduMasterBillingOrderFailed');
    const claim = source.indexOf('claimSpokeduMasterBillingOrder');
    const pay = source.lastIndexOf('payment = await paySpokeduMasterBillingKey');
    const store = source.lastIndexOf('billingKeySecretId = await storeSpokeduMasterBillingKey');
    expect(claim).toBeGreaterThan(-1);
    expect(pay).toBeGreaterThan(claim);
    expect(store).toBeGreaterThan(pay);
  });

  it('reclaims stale processing and re-applies charged renewal orders without double charge', () => {
    const source = read('app/api/spokedu-master/payment/billing/renew/route.ts');
    expect(source).toContain('.insert({');
    expect(source).toContain("orderInsertError.code !== '23505'");
    expect(source).toContain('claimSpokeduMasterBillingOrder');
    expect(source).toContain('shouldReapplySpokeduMasterBillingOrder');
    expect(source).toContain('markSpokeduMasterBillingOrderFailed');
    expect(source).toContain(".order('next_billing_at', { ascending: true })");
    expect(source).not.toContain('upsert({');
  });

  it('defines a shared stale-processing reclaim lease for billing orders', () => {
    const source = read('app/lib/server/spokeduMasterBillingOrders.ts');
    expect(source).toContain('SPOKEDU_MASTER_BILLING_PROCESSING_STALE_MS');
    expect(source).toContain(".eq('status', 'processing')");
    expect(source).toContain(".lt('updated_at', staleProcessingCutoffIso())");
    expect(source).toContain("status: input.recoverable ? 'recoverable_failed' : 'failed'");
  });

  it('looks up existing Toss payments by orderId before charging again', () => {
    const provider = read('app/lib/server/spokeduMasterBillingProvider.ts');
    const issue = read('app/api/spokedu-master/payment/billing/issue/route.ts');
    const renew = read('app/api/spokedu-master/payment/billing/renew/route.ts');
    expect(provider).toContain('findSpokeduMasterPaymentByOrderId');
    expect(provider).toContain('/payments/orders/');
    expect(issue).toContain('findSpokeduMasterPaymentByOrderId');
    expect(renew).toContain('findSpokeduMasterPaymentByOrderId');
  });
});
