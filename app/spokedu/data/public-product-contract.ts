/**
 * 마케팅 공개 제품 계약 — MASTER 공개 슬라이스만 re-export.
 * `productCatalog.ts` 전체를 deep import하지 않는다.
 */
export {
  getPublicCenterInquiry,
  getPublicPlan,
  getPublicProductContract,
  getPublicPurchasablePlans,
  PUBLIC_PRODUCT_CONTRACT_SCHEMA_VERSION,
  type PublicBillingCycle,
  type PublicCenterInquiry,
  type PublicPlanCode,
  type PublicProductContract,
  type PublicProductHandoff,
  type PublicProductPlan,
  type PublicSpomatPublicSlice,
  type PublicSubscriptionPlanCode,
} from '@/app/spokedu-master/lib/publicProductContract';
