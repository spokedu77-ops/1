import { describe, expect, it } from 'vitest';
import {
  MASTER_LITE_PRICE_KRW,
  MASTER_PREMIUM_PRICE_KRW,
  MASTER_PRODUCT_CATALOG,
} from '@/app/spokedu-master/lib/productCatalog';
import {
  getPublicCenterInquiry,
  getPublicPlan,
  getPublicProductContract,
  getPublicPurchasablePlans,
  PUBLIC_PRODUCT_CONTRACT_SCHEMA_VERSION,
} from './publicProductContract';

describe('MASTER public product contract', () => {
  it('derives purchasable monthly prices only from productCatalog (no redeclared amounts)', () => {
    const contract = getPublicProductContract();
    expect(contract.schemaVersion).toBe(PUBLIC_PRODUCT_CONTRACT_SCHEMA_VERSION);
    expect(contract.annualSold).toBe(false);
    expect(contract.freeStartSupported).toBe(true);
    expect(contract.productDisplayName).toBe('SPOKEDU LAB');

    const lite = getPublicPlan('lite');
    const premium = getPublicPlan('premium');
    expect(lite?.monthlyPriceKrw).toBe(MASTER_LITE_PRICE_KRW);
    expect(premium?.monthlyPriceKrw).toBe(MASTER_PREMIUM_PRICE_KRW);
    expect(lite?.monthlyPriceKrw).toBe(MASTER_PRODUCT_CATALOG.lite.monthlyPriceKrw);
    expect(premium?.monthlyPriceKrw).toBe(MASTER_PRODUCT_CATALOG.premium.monthlyPriceKrw);
    expect(lite?.priceLabel).toBe(MASTER_PRODUCT_CATALOG.lite.priceLabel);
    expect(premium?.priceLabel).toBe(MASTER_PRODUCT_CATALOG.premium.priceLabel);
  });

  it('keeps Free as browse + one weekly recommendation + three class tools', () => {
    const free = getPublicPlan('free');
    const contract = getPublicProductContract();
    expect(free?.purchasable).toBe(false);
    expect(free?.priceLabel).toBeNull();
    expect(free?.featureSummary).toEqual(['Library 탐색', '이번 주 추천 프로그램 1개 전체 이용', '수업 도구 3종']);
    expect(contract.freeScopeNote).toContain('Library 탐색');
    expect(contract.freeScopeNote).toContain('이번 주 추천 프로그램 1개 전체 이용');
    expect(contract.freeScopeNote).toContain('스탑워치·타이머·점수판');
    expect(contract.freeScopeNote).not.toContain('체험');
    expect(contract.plans.map((p) => p.code)).toEqual(['free', 'lite', 'premium']);
    expect(contract.plans.some((p) => p.code === ('center' as never))).toBe(false);
  });

  it('keeps Center as separate inquiry track, not a subscription plan peer', () => {
    const center = getPublicCenterInquiry();
    expect(center.purchasable).toBe(false);
    expect(center.contactRequired).toBe(true);
    expect(center.monthlyPriceKrw).toBeNull();
    expect(center.priceLabel).toBeNull();
    expect(center.displayName).toBe('센터·기관 이용 문의');
    expect(getPublicPlan('center' as never)).toBeNull();
  });

  it('does not publish SPOMAT prices on the public slice', () => {
    const { spomat } = getPublicProductContract();
    expect(spomat.pricesPublished).toBe(false);
    expect(spomat).not.toHaveProperty('memberPriceRequiresPremium');
    expect(JSON.stringify(spomat)).not.toMatch(/20900|15900|20,?900|15,?900/);
  });

  it('exposes only lite/premium as purchasable public plans', () => {
    expect(getPublicPurchasablePlans().map((p) => p.code)).toEqual(['lite', 'premium']);
  });

  it('does not leak entitlement keys into the public slice', () => {
    const json = JSON.stringify(getPublicProductContract());
    expect(json).not.toMatch(
      /canUseLibrary|canUseClassTools|canUseAttendance|canUseRecords|canUseSpomove|serverPlanKey|serverAmount/,
    );
  });

  it('wires real MASTER handoff paths', () => {
    const { handoff } = getPublicProductContract();
    expect(handoff.freeStartHref).toBe('/spokedu-master/login?next=/spokedu-master/onboarding');
    expect(handoff.loginHref).toBe('/spokedu-master/login?next=/spokedu-master/dashboard');
    expect(handoff.landingHref).toBe('/spokedu-lab');
    expect(handoff.paymentPlanHref('lite')).toBe('/spokedu-master/payment?plan=lite');
    expect(handoff.paymentPlanHref('premium')).toBe('/spokedu-master/payment?plan=premium');
    expect(handoff.shopHref).toBe('/spokedu-master/shop');
  });
});
