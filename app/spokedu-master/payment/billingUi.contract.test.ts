import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

const payment = read('app/spokedu-master/payment/page.tsx');
const success = read('app/spokedu-master/payment/success/page.tsx');
const cancel = read('app/spokedu-master/payment/cancel/page.tsx');
const subscription = read('app/spokedu-master/subscription/page.tsx');
const profile = read('app/spokedu-master/profile/page.tsx');
const catalog = read('app/spokedu-master/lib/productCatalog.ts');
const issueRoute = read('app/api/spokedu-master/payment/billing/issue/route.ts');

describe('SPOKEDU MASTER recurring billing UI contract', () => {
  it('shows Lite and Premium prices from the shared catalog and keeps Center inquiry-only', () => {
    expect(catalog).toContain('MASTER_LITE_PRICE_KRW = 9900');
    expect(catalog).toContain('MASTER_PREMIUM_PRICE_KRW = 28900');
    expect(catalog).toContain("serverPlanKey: 'lite'");
    expect(payment).toContain('getDirectPurchaseMasterProducts');
    expect(subscription).toContain('getDirectPurchaseMasterProducts');
    expect(payment).toContain('MASTER_PRODUCT_CATALOG.center');
    expect(subscription).toContain('직접 결제 없음');
  });

  it('starts Toss billing auth instead of one-time checkout and sends no client amount', () => {
    expect(payment).toContain('requestBillingAuth');
    expect(payment).toContain('successUrl.searchParams.set');
    expect(payment).toContain("successUrl.searchParams.set('plan', selectedPlan)");
    expect(payment).not.toContain('/api/spokedu-master/payment/create-checkout');
    expect(payment).not.toContain('requestPayment');
    expect(payment).not.toContain('amount:');
    expect(payment).not.toContain('localStorage');
  });

  it('activates only through billing issue after authKey callback', () => {
    expect(success).toContain('/api/spokedu-master/payment/billing/issue');
    expect(success).toContain('authKey');
    expect(success).toContain('customerKey');
    expect(success).toContain('planId: plan');
    expect(success).not.toContain('/api/spokedu-master/payment/confirm');
    expect(issueRoute).toContain('planId?: string');
    expect(issueRoute).toContain('const requestedPlan = body.planId ?? body.plan');
  });

  it('keeps failure and cancel paths non-entitling and retryable', () => {
    expect(cancel).toContain('구독이 활성화되지 않았습니다');
    expect(cancel).toContain('/spokedu-master/payment?plan=${retryPlan}');
    expect(success).toContain("setStatus('failed')");
    expect(success).toContain('완료 전에는 유료 권한이 부여되지 않습니다');
  });

  it('blocks active duplicate purchase entry and removes legacy purchase starts', () => {
    expect(payment).toContain('이미 활성 이용권이 있습니다');
    expect(payment).toContain('중복 결제');
    expect(subscription).toContain('변경은 다음 단계');
    expect(profile).toContain("plan.id !== 'free' && plan.id !== 'school'");
    for (const source of [payment, success, cancel, subscription, profile]) {
      expect(source).not.toContain('payment?plan=pro');
      expect(source).not.toContain('payment?plan=team');
      expect(source).not.toContain('/api/spokedu-master/payment/create-checkout');
    }
  });
});
