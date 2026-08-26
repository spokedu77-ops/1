export { MASTER_BUSINESS_INFO, MASTER_CUSTOMER_SERVICE_HREF, MASTER_CENTER_INQUIRY_HREF } from './businessInfo';
export const MASTER_SUPPORT_EMAIL = 'spokedu77@gmail.com';

export const MASTER_LITE_PRICE_KRW = 9900;
export const MASTER_PREMIUM_PRICE_KRW = 28900;

export const SPOMAT_PRODUCT_CONTRACT = {
  regularPrice: 20900,
  premiumPrice: 15900,
  discountAmount: 5000,
  premiumRequired: true,
} as const;

export type MasterProductKey = 'lite' | 'premium' | 'center';
export type MasterBillingCycle = 'monthly' | 'sales_inquiry';
export type MasterFeatureEntitlements = {
  canUseLibrary: boolean;
  canUseClassTools: boolean;
  canUseAttendance: boolean;
  canUseRecords: boolean;
  canUseSpomove: boolean;
};

export type MasterProductCatalogItem = {
  id: MasterProductKey;
  key: MasterProductKey;
  displayName: string;
  monthlyPriceKrw: number | null;
  priceLabel: string;
  durationLabel: string;
  billingCycle: MasterBillingCycle;
  billingCycleLabel: string;
  statusLabel: string;
  autoRenewal: boolean;
  purchasable: boolean;
  contactRequired: boolean;
  comingSoon: boolean;
  featureEntitlements: MasterFeatureEntitlements;
  canBuySpomatAtMemberPrice: boolean;
  serverPlanKey: 'lite' | 'premium' | null;
  serverAmount: number | null;
};

export const MASTER_BASE_FEATURE_ENTITLEMENTS: MasterFeatureEntitlements = {
  canUseLibrary: true,
  canUseClassTools: true,
  canUseAttendance: true,
  canUseRecords: false,
  canUseSpomove: false,
};



const MASTER_PRODUCT_CATALOG_BASE: Record<MasterProductKey, MasterProductCatalogItem> = {
  lite: {
    id: 'lite',
    key: 'lite',
    displayName: 'SPOKEDU MASTER 라이트',
    monthlyPriceKrw: MASTER_LITE_PRICE_KRW,
    priceLabel: '월 9,900원',
    durationLabel: '월 자동결제',
    billingCycle: 'monthly',
    billingCycleLabel: '월 자동결제',
    statusLabel: '직접 결제 가능',
    autoRenewal: true,
    purchasable: true,
    contactRequired: false,
    comingSoon: false,
    featureEntitlements: {
      ...MASTER_BASE_FEATURE_ENTITLEMENTS,
    },
    canBuySpomatAtMemberPrice: false,
    serverPlanKey: 'lite',
    serverAmount: MASTER_LITE_PRICE_KRW,
  },
  premium: {
    id: 'premium',
    key: 'premium',
    displayName: 'SPOKEDU MASTER 프리미엄',
    monthlyPriceKrw: MASTER_PREMIUM_PRICE_KRW,
    priceLabel: '월 28,900원',
    durationLabel: '월 자동결제',
    billingCycle: 'monthly',
    billingCycleLabel: '월 자동결제',
    statusLabel: '직접 결제 가능',
    autoRenewal: true,
    purchasable: true,
    contactRequired: false,
    comingSoon: false,
    featureEntitlements: {
      ...MASTER_BASE_FEATURE_ENTITLEMENTS,
      canUseSpomove: true,
      canUseRecords: true,
    },
    canBuySpomatAtMemberPrice: true,
    serverPlanKey: 'premium',
    serverAmount: MASTER_PREMIUM_PRICE_KRW,
  },
  center: {
    id: 'center',
    key: 'center',
    displayName: 'SPOKEDU MASTER 센터·기관',
    monthlyPriceKrw: null,
    priceLabel: '별도 문의',
    durationLabel: '직접 결제 없음',
    billingCycle: 'sales_inquiry',
    billingCycleLabel: '별도 문의',
    statusLabel: '상담 상품',
    autoRenewal: false,
    purchasable: false,
    contactRequired: true,
    comingSoon: false,
    featureEntitlements: {
      ...MASTER_BASE_FEATURE_ENTITLEMENTS,
      canUseSpomove: true,
      canUseRecords: true,
    },
    canBuySpomatAtMemberPrice: false,
    serverPlanKey: null,
    serverAmount: null,
  },
};

export const MASTER_PRODUCT_CATALOG = MASTER_PRODUCT_CATALOG_BASE;

export function getDirectPurchaseMasterProducts() {
  return Object.values(MASTER_PRODUCT_CATALOG).filter((product) => product.purchasable);
}

export function getMasterProduct(key: MasterProductKey) {
  return MASTER_PRODUCT_CATALOG[key];
}

export function getMasterProductRenewalLabel(product: MasterProductCatalogItem) {
  return product.autoRenewal ? '월 자동결제' : '직접 결제 없음';
}

export function getMasterProductPriceWithDuration(product: MasterProductCatalogItem) {
  return `${product.priceLabel} / ${product.billingCycleLabel}`;
}

export function getMasterProductActionLabel(product: MasterProductCatalogItem) {
  if (product.purchasable) return `${product.displayName.replace('SPOKEDU MASTER ', '')} 시작하기`;
  if (product.contactRequired) return product.priceLabel;
  return product.billingCycleLabel;
}

/**
 * VALUE PROMISE SSOT — outcome first, features as evidence.
 * Lite = weekly operate. Premium = operate + connected memory (+ SPOMOVE).
 * Do not rephrase differently on Landing / Payment / Gate / Subscription.
 */
export function getMasterProductPaymentFeatureLabels(product: MasterProductCatalogItem) {
  if (product.id === 'lite') {
    return ['오늘 수업을 찾고 현장에서 운영', '라이브러리 · 수업반 · 일정', '출석 기록과 다음 수업 이어가기'];
  }
  if (product.id === 'premium') {
    return ['지난 수업이 다음 준비로 이어짐', '메모 · 학생 이력 · 안내문 작성·복사', 'SPOMOVE 공식 활동', 'SPOMAT 회원가'];
  }
  return ['별도 문의', '직접 결제 없음'];
}

export function getMasterProductPaymentDescription(product: MasterProductCatalogItem) {
  if (product.id === 'lite') {
    return '오늘 수업을 찾고 현장에서 운영하는 기본입니다.';
  }
  if (product.id === 'premium') {
    return '매주 기록이 쌓이고 다음 수업 준비까지 이어지는 전체 운영 환경입니다.';
  }
  return '이용 인원과 운영 방식에 맞춰 별도로 안내합니다.';
}

/** Short workflow lines for Subscription "what I keep paying for" — not usage stats. */
export function getMasterPlanValueWorkflowLines(plan: 'lite' | 'premium' | 'pro') {
  if (plan === 'lite') {
    return getMasterProductPaymentFeatureLabels(MASTER_PRODUCT_CATALOG.lite);
  }
  return getMasterProductPaymentFeatureLabels(MASTER_PRODUCT_CATALOG.premium);
}

export function canPurchaseDirectly(product: MasterProductCatalogItem) {
  return product.purchasable;
}

export function requiresSalesInquiry(product: MasterProductCatalogItem) {
  return product.contactRequired;
}

export function buildMasterSupportMailto(subject: string, body = '') {
  const query = new URLSearchParams({ subject });
  if (body.trim()) query.set('body', body);
  return `mailto:${MASTER_SUPPORT_EMAIL}?${query.toString()}`;
}
