import { describe, expect, it } from 'vitest';
import {
  canPurchaseDirectly,
  getDirectPurchaseMasterProducts,
  MASTER_PRODUCT_CATALOG,
  MASTER_SUPPORT_EMAIL,
  MASTER_LITE_PRICE_KRW,
  MASTER_PREMIUM_PRICE_KRW,
  requiresSalesInquiry,
  SPOMAT_PRODUCT_CONTRACT,
} from './productCatalog';

describe('SPOKEDU MASTER product catalog', () => {
  it('contains only the new public product IDs', () => {
    expect(Object.keys(MASTER_PRODUCT_CATALOG).sort()).toEqual(['center', 'lite', 'premium']);
  });

  it('defines Lite as a monthly direct-purchase plan without SPOMOVE', () => {
    const lite = MASTER_PRODUCT_CATALOG.lite;
    expect(lite.monthlyPriceKrw).toBe(9900);
    expect(MASTER_LITE_PRICE_KRW).toBe(9900);
    expect(lite.billingCycle).toBe('monthly');
    expect(lite.autoRenewal).toBe(true);
    expect(canPurchaseDirectly(lite)).toBe(true);
    expect(lite.featureEntitlements).toMatchObject({
      canUseLibrary: true,
      canUseClassTools: true,
      canUseRecords: true,
      canUseSpomove: false,
    });
  });

  it('defines Premium as a monthly direct-purchase plan with SPOMOVE and SPOMAT member price', () => {
    const premium = MASTER_PRODUCT_CATALOG.premium;
    expect(premium.monthlyPriceKrw).toBe(28900);
    expect(MASTER_PREMIUM_PRICE_KRW).toBe(28900);
    expect(premium.billingCycle).toBe('monthly');
    expect(premium.autoRenewal).toBe(true);
    expect(canPurchaseDirectly(premium)).toBe(true);
    expect(premium.featureEntitlements.canUseSpomove).toBe(true);
    expect(premium.canBuySpomatAtMemberPrice).toBe(true);
  });

  it('keeps Center as sales-inquiry only without direct checkout', () => {
    const center = MASTER_PRODUCT_CATALOG.center;
    expect(center.monthlyPriceKrw).toBeNull();
    expect(center.priceLabel).toBe('별도 문의');
    expect(canPurchaseDirectly(center)).toBe(false);
    expect(requiresSalesInquiry(center)).toBe(true);
    expect(MASTER_SUPPORT_EMAIL).toBe('spokedu77@gmail.com');
  });

  it('has no trial product and keeps SPOMAT contract prices in one place', () => {
    expect(Object.keys(MASTER_PRODUCT_CATALOG)).not.toContain('trial');
    expect(SPOMAT_PRODUCT_CONTRACT).toEqual({
      regularPrice: 20900,
      premiumPrice: 15900,
      discountAmount: 5000,
      premiumRequired: true,
    });
  });

  it('returns only directly purchasable public products', () => {
    expect(getDirectPurchaseMasterProducts().map((product) => product.id)).toEqual(['lite', 'premium']);
  });
});
