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
  canUseRecords: true,
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

export function getMasterProductPaymentFeatureLabels(product: MasterProductCatalogItem) {
  if (product.id === 'lite') {
    return ['라이브러리', '수업 도구', '수업 기록', '안내문', '내 활동·기록'];
  }
  if (product.id === 'premium') {
    return ['라이트의 모든 기능', 'SPOMOVE', 'SPOMAT 회원가 구매 대상'];
  }
  return ['별도 문의', '직접 결제 없음'];
}

export function getMasterProductPaymentDescription(product: MasterProductCatalogItem) {
  if (product.id === 'lite') {
    return 'SPOMOVE를 제외한 수업 준비·운영 기능을 이용할 수 있습니다.';
  }
  if (product.id === 'premium') {
    return 'SPOMOVE를 포함한 SPOKEDU MASTER의 모든 기능을 이용할 수 있습니다.';
  }
  return '이용 인원과 운영 방식에 맞춰 별도로 안내합니다.';
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
