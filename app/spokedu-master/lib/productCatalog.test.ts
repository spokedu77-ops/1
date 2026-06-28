import { describe, expect, it } from 'vitest';
import {
  getDirectPurchaseMasterProducts,
  MASTER_PRODUCT_CATALOG,
  MASTER_PRO_DURATION_DAYS,
  MASTER_PRO_PRICE_KRW,
  MASTER_SUPPORT_EMAIL,
} from './productCatalog';
import {
  isSpokeduMasterDirectPurchasePlan,
  SPOKEDU_MASTER_PLAN_CONFIG,
} from '@/app/lib/server/spokeduMasterPayment';

describe('SPOKEDU MASTER product catalog', () => {
  it('keeps Pro display price and server payment amount aligned', () => {
    expect(MASTER_PRODUCT_CATALOG.pro.serverPlanKey).toBe('pro');
    expect(MASTER_PRODUCT_CATALOG.pro.serverAmount).toBe(SPOKEDU_MASTER_PLAN_CONFIG.pro.amount);
    expect(MASTER_PRO_PRICE_KRW).toBe(SPOKEDU_MASTER_PLAN_CONFIG.pro.amount);
    expect(MASTER_PRODUCT_CATALOG.pro.priceLabel).toContain('39,900');
    expect(MASTER_PRODUCT_CATALOG.pro.durationLabel).toContain(String(MASTER_PRO_DURATION_DAYS));
  });

  it('allows direct purchase only for Pro', () => {
    expect(getDirectPurchaseMasterProducts().map((product) => product.key)).toEqual(['pro']);
    expect(isSpokeduMasterDirectPurchasePlan('pro')).toBe(true);
    expect(isSpokeduMasterDirectPurchasePlan('team')).toBe(false);
    expect(MASTER_PRODUCT_CATALOG.pro.purchasable).toBe(true);
  });

  it('treats Center and School as contact products and Lite as coming soon', () => {
    expect(MASTER_PRODUCT_CATALOG.center.purchasable).toBe(false);
    expect(MASTER_PRODUCT_CATALOG.center.contactRequired).toBe(true);
    expect(MASTER_PRODUCT_CATALOG.school.purchasable).toBe(false);
    expect(MASTER_PRODUCT_CATALOG.school.contactRequired).toBe(true);
    expect(MASTER_PRODUCT_CATALOG.lite.purchasable).toBe(false);
    expect(MASTER_PRODUCT_CATALOG.lite.comingSoon).toBe(true);
    expect(MASTER_SUPPORT_EMAIL).toBe('support@spokedu.com');
  });

  it('does not promise unavailable parent sharing or automated delivery as Pro features', () => {
    const features = MASTER_PRODUCT_CATALOG.pro.features.join('\n');
    expect(features).toContain('안내문 작성·저장·복사');
    expect(features).not.toContain('보호자용 공개 링크');
    expect(features).not.toContain('카카오톡');
    expect(features).not.toContain('문자 자동');
  });
});
