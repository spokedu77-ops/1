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
const nextConfig = read('next.config.ts');

describe('SPOKEDU MASTER recurring billing UI contract', () => {
  it('shows Lite and Premium prices from the shared catalog and keeps Center inquiry-only', () => {
    expect(catalog).toContain('MASTER_LITE_PRICE_KRW = 9900');
    expect(catalog).toContain('MASTER_PREMIUM_PRICE_KRW = 28900');
    expect(catalog).toContain("serverPlanKey: 'lite'");
    expect(catalog).toContain("serverPlanKey: 'premium'");
    expect(catalog).toContain('getMasterProductPaymentFeatureLabels');
    expect(payment).toContain('getDirectPurchaseMasterProducts');
    expect(payment).toContain('getMasterProductPaymentFeatureLabels(product)');
    expect(payment).toContain('MASTER_CENTER_INQUIRY_HREF');
    expect(payment).not.toContain('product={MASTER_PRODUCT_CATALOG.center}');
  });

  it('starts Toss billing auth instead of one-time checkout and sends no client amount', () => {
    expect(payment).toContain('requestBillingAuth');
    expect(payment).toContain("successUrl.searchParams.set('plan', plan)");
    expect(payment).toContain("failUrl.searchParams.set('plan', plan)");
    expect(payment).not.toContain('/api/spokedu-master/payment/create-checkout');
    expect(payment).not.toContain('requestPayment');
    expect(payment).not.toContain('amount:');
    expect(payment).not.toContain('localStorage');
  });

  it('allows the Toss billing auth frame through CSP', () => {
    expect(nextConfig).toContain('Content-Security-Policy');
    expect(nextConfig).toContain('payment-gateway-sandbox.tosspayments.com');
    expect(nextConfig).toContain('payment-gateway.tosspayments.com');
  });

  it('uses only lite and premium plan IDs for payment CTAs', () => {
    expect(payment).toContain("type PaidPlanId = 'lite' | 'premium'");
    expect(payment).toContain('data-plan-id={planId ?? undefined}');
    expect(payment).toContain('const planId = product.serverPlanKey as PaidPlanId');
    expect(payment).toContain('startBillingAuth(planId)');
    expect(payment).not.toContain("payment?plan=pro");
    expect(payment).not.toContain("payment?plan=team");
  });

  it('activates only through billing issue after authKey callback', () => {
    expect(success).toContain('/api/spokedu-master/payment/billing/issue');
    expect(success).toContain('authKey');
    expect(success).toContain('customerKey');
    expect(success).toContain('planId: plan');
    expect(success).toContain("setStatus('failed')");
    expect(success).not.toContain('/api/spokedu-master/payment/confirm');
    expect(issueRoute).toContain('planId?: string');
    expect(issueRoute).toContain('const requestedPlan = body.planId ?? body.plan');
    expect(issueRoute).toContain('body.amount !== undefined && body.amount !== amount');
  });

  it('cleans pending billing attempts when first payment activation fails', () => {
    expect(issueRoute).toContain('cleanupPendingBillingAttempt');
    expect(issueRoute).toContain(".eq('status', 'pending')");
    expect(issueRoute).toContain(".eq('provider_billing_key_secret_id', input.secretId)");
    expect(issueRoute).toContain('await cleanupPendingBillingAttempt({ service, userId: user.id, secretId: billingKeySecretId })');
  });

  it('keeps failure and cancel paths non-entitling, readable, and retryable', () => {
    expect(cancel).toContain('구독은 활성화되지 않았습니다.');
    expect(cancel).toContain('/spokedu-master/payment?plan=${retryPlan}');
    expect(cancel).toContain('MASTER_CUSTOMER_SERVICE_HREF');
    expect(success).toContain('완료 전에는 이용권이 활성화되지 않습니다.');
    expect(success).toContain('결제 인증이 취소되었거나 처리 중 오류가 발생했습니다.');
    expect(success).toContain('hasMasterEntitlement');
    expect(success).toContain('/api/spokedu-master/profile');
  });

  it('blocks duplicate purchase for premium active and allows lite to premium upgrade', () => {
    expect(payment).toContain('canStartPaidPlanCheckout');
    expect(payment).toContain('getPaymentPageMode');
    expect(payment).toContain('프리미엄으로 업그레이드');
    expect(payment).not.toContain('blocksNewPayment');
    expect(subscription).toContain('canUpgradeToPremium');
    expect(subscription).toContain('upgradeHref');
    expect(subscription).toContain('display.upgradeLabel');
    expect(read('app/spokedu-master/profile/subscriptionSummary.ts')).toContain("upgradeLabel: canUpgrade ? '프리미엄으로 업그레이드' : null");
    expect(subscription).toContain('/spokedu-master/payment');
    expect(profile).not.toContain('/spokedu-master/payment?plan=');
    for (const source of [payment, success, cancel, subscription, profile]) {
      expect(source).not.toContain('/api/spokedu-master/payment/create-checkout');
      expect(source).not.toContain('무료 체험 시작');
      expect(source).not.toContain('30일 이용권');
      expect(source).not.toContain('SPOMOVE 이용하기');
    }
  });

  it('keeps success screen focused on home and subscription management only', () => {
    expect(success).toContain('홈으로');
    expect(success).toContain('구독 관리');
    expect(success).toContain('/spokedu-master/dashboard');
    expect(success).toContain('/spokedu-master/subscription');
    expect(success).not.toContain('/spokedu-master/shop');
    expect(success).not.toContain('/spokedu-master/spomove');
  });
});
