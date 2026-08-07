/**
 * MASTER → 마케팅 공개 제품 슬라이스.
 * entitlement key · 내부 결제 코드 · 실험 플래그는 노출하지 않는다.
 * 가격·purchasable은 productCatalog에서만 파생한다 (숫자 재선언 금지).
 *
 * Free SSOT (entitlement): 수업 도구만.
 * 대시보드의 「추천 미리보기 1장」은 entitlement가 아니며 공개 기능 범위에 넣지 않는다.
 * Center: Lite/Premium peer 플랜이 아니라 sales_inquiry 전용.
 */
import {
  getMasterProductPaymentFeatureLabels,
  MASTER_PRODUCT_CATALOG,
} from './productCatalog';

export const PUBLIC_PRODUCT_CONTRACT_SCHEMA_VERSION = 1 as const;

/** 셀프 구독 비교용 플랜 (Center 제외) */
export type PublicSubscriptionPlanCode = 'free' | 'lite' | 'premium';

export type PublicPlanCode = PublicSubscriptionPlanCode | 'center';

export type PublicBillingCycle = 'none' | 'monthly' | 'sales_inquiry';

export type PublicProductPlan = {
  code: PublicSubscriptionPlanCode;
  displayName: string;
  monthlyPriceKrw: number | null;
  priceLabel: string | null;
  billingCycle: PublicBillingCycle;
  billingCycleLabel: string;
  purchasable: boolean;
  contactRequired: boolean;
  featureSummary: readonly string[];
  includesSpomove: boolean;
  spomatMemberEligible: boolean;
};

/** 기관·센터 별도 문의 — 구독 플랜 카드와 동급으로 취급하지 않음 */
export type PublicCenterInquiry = {
  code: 'center';
  displayName: string;
  contactRequired: true;
  purchasable: false;
  monthlyPriceKrw: null;
  priceLabel: null;
  billingCycle: 'sales_inquiry';
  billingCycleLabel: string;
  summary: readonly string[];
  ctaLabel: string;
};

export type PublicProductHandoff = {
  freeStartHref: string;
  loginHref: string;
  landingHref: string;
  paymentHref: string;
  shopHref: string;
  paymentPlanHref: (plan: 'lite' | 'premium') => string;
};

export type PublicSpomatPublicSlice = {
  pricesPublished: false;
  memberPriceRequiresPremium: true;
  shopHref: string;
  confirmLabel: string;
  /** 마케팅에서 공식 구매 CTA로 쓸 수 있는 안내 라벨 (가격 비포함) */
  purchaseGuideLabel: string;
};

export type PublicProductContract = {
  schemaVersion: typeof PUBLIC_PRODUCT_CONTRACT_SCHEMA_VERSION;
  productDisplayName: string;
  annualSold: false;
  freeStartSupported: true;
  /** Free entitlement 범위 설명 — 추천 활동 이용권 아님 */
  freeScopeNote: string;
  /** Free / Lite / Premium만 */
  plans: readonly PublicProductPlan[];
  /** 센터·기관 이용 문의 (플랜 카드 밖) */
  centerInquiry: PublicCenterInquiry;
  spomat: PublicSpomatPublicSlice;
  handoff: PublicProductHandoff;
};

const HANDOFF_PATHS = {
  landing: '/spokedu-master/landing',
  onboardingLogin: '/login?next=/spokedu-master/onboarding',
  dashboardLogin: '/login?next=/spokedu-master/dashboard',
  payment: '/spokedu-master/payment',
  shop: '/spokedu-master/shop',
} as const;

function catalogSubscriptionToPublic(key: 'lite' | 'premium'): PublicProductPlan {
  const item = MASTER_PRODUCT_CATALOG[key];
  const hasPublicPrice = item.purchasable && item.monthlyPriceKrw != null;
  return {
    code: key,
    displayName: key === 'lite' ? 'Lite' : 'Premium',
    monthlyPriceKrw: hasPublicPrice ? item.monthlyPriceKrw : null,
    priceLabel: hasPublicPrice ? item.priceLabel : null,
    billingCycle: 'monthly',
    billingCycleLabel: item.billingCycleLabel,
    purchasable: item.purchasable,
    contactRequired: item.contactRequired,
    featureSummary: getMasterProductPaymentFeatureLabels(item),
    includesSpomove: item.featureEntitlements.canUseSpomove,
    spomatMemberEligible: item.canBuySpomatAtMemberPrice,
  };
}

const FREE_PLAN: PublicProductPlan = {
  code: 'free',
  displayName: '무료',
  monthlyPriceKrw: null,
  priceLabel: null,
  billingCycle: 'none',
  billingCycleLabel: '로그인 후 이용',
  purchasable: false,
  contactRequired: false,
  featureSummary: ['무료 수업 도구'],
  includesSpomove: false,
  spomatMemberEligible: false,
};

const CENTER_INQUIRY: PublicCenterInquiry = {
  code: 'center',
  displayName: '센터·기관 이용 문의',
  contactRequired: true,
  purchasable: false,
  monthlyPriceKrw: null,
  priceLabel: null,
  billingCycle: 'sales_inquiry',
  billingCycleLabel: '별도 문의',
  summary: ['직접 결제 없음', '이용 인원·운영 방식에 맞춰 안내'],
  ctaLabel: '센터·기관 이용 문의',
};

let cached: PublicProductContract | null = null;

/** 공개 계약 스냅샷 — 마케팅·랜딩은 이 슬라이스만 소비한다. */
export function getPublicProductContract(): PublicProductContract {
  if (cached) return cached;

  const handoff: PublicProductHandoff = {
    freeStartHref: HANDOFF_PATHS.onboardingLogin,
    loginHref: HANDOFF_PATHS.dashboardLogin,
    landingHref: HANDOFF_PATHS.landing,
    paymentHref: HANDOFF_PATHS.payment,
    shopHref: HANDOFF_PATHS.shop,
    paymentPlanHref: (plan) => `${HANDOFF_PATHS.payment}?plan=${plan}`,
  };

  cached = {
    schemaVersion: PUBLIC_PRODUCT_CONTRACT_SCHEMA_VERSION,
    productDisplayName: '스포키듀 구독시스템',
    annualSold: false,
    freeStartSupported: true,
    freeScopeNote:
      '무료 범위는 로그인 후 수업 도구입니다. 대시보드의 추천 미리보기는 이용 entitlement가 아닙니다.',
    plans: [FREE_PLAN, catalogSubscriptionToPublic('lite'), catalogSubscriptionToPublic('premium')],
    centerInquiry: CENTER_INQUIRY,
    spomat: {
      pricesPublished: false,
      memberPriceRequiresPremium: true,
      shopHref: HANDOFF_PATHS.shop,
      confirmLabel: '구독시스템에서 확인',
      purchaseGuideLabel: '구매 안내 확인',
    },
    handoff,
  };

  return cached;
}

export function getPublicPurchasablePlans() {
  return getPublicProductContract().plans.filter((plan) => plan.purchasable && plan.priceLabel);
}

export function getPublicPlan(code: PublicSubscriptionPlanCode) {
  return getPublicProductContract().plans.find((plan) => plan.code === code) ?? null;
}

/** @deprecated Center는 plans가 아니라 centerInquiry */
export function getPublicCenterInquiry() {
  return getPublicProductContract().centerInquiry;
}
