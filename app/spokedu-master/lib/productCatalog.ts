export const MASTER_SUPPORT_EMAIL = 'support@spokedu.com';

export const MASTER_PRO_PRICE_KRW = 39900;
export const MASTER_PRO_DURATION_DAYS = 30;
export const MASTER_TRIAL_DAYS = 14;

export type MasterProductKey = 'pro' | 'center' | 'lite' | 'school';

export type MasterProductCatalogItem = {
  key: MasterProductKey;
  displayName: string;
  priceLabel: string;
  durationLabel: string;
  serverPlanKey: 'pro' | 'team' | null;
  serverAmount: number | null;
  autoRenewal: false;
  purchasable: boolean;
  contactRequired: boolean;
  comingSoon: boolean;
  statusLabel: string;
  features: string[];
};

export const MASTER_PRO_FEATURES = [
  '라이브러리',
  'SPOMOVE 실행',
  '학생 관리',
  '수업 기록',
  '학생별 기록 확인',
  '안내문 작성·저장·복사',
  '즐겨찾기·최근 활동',
] as const;

export const MASTER_PRODUCT_CATALOG: Record<MasterProductKey, MasterProductCatalogItem> = {
  pro: {
    key: 'pro',
    displayName: 'SPOKEDU MASTER Pro',
    priceLabel: '39,900원',
    durationLabel: '30일 이용권',
    serverPlanKey: 'pro',
    serverAmount: MASTER_PRO_PRICE_KRW,
    autoRenewal: false,
    purchasable: true,
    contactRequired: false,
    comingSoon: false,
    statusLabel: '직접 결제 가능',
    features: [...MASTER_PRO_FEATURES],
  },
  center: {
    key: 'center',
    displayName: 'SPOKEDU MASTER Center',
    priceLabel: '도입 상담',
    durationLabel: '기관 도입 상담',
    serverPlanKey: 'team',
    serverAmount: null,
    autoRenewal: false,
    purchasable: false,
    contactRequired: true,
    comingSoon: false,
    statusLabel: '상담 상품',
    features: [
      '현재 Pro와 동일한 MASTER 기능 이용',
      '강사 초대·다중 사용자·기관 단위 데이터 관리는 아직 제공하지 않음',
      '기존 Center 활성 이용자는 유지',
    ],
  },
  lite: {
    key: 'lite',
    displayName: 'SPOKEDU MASTER Lite',
    priceLabel: '준비 중',
    durationLabel: '출시 전',
    serverPlanKey: null,
    serverAmount: null,
    autoRenewal: false,
    purchasable: false,
    contactRequired: false,
    comingSoon: true,
    statusLabel: '준비 중',
    features: ['준비 중인 상품입니다.', '현재 결제 CTA를 제공하지 않습니다.'],
  },
  school: {
    key: 'school',
    displayName: 'SPOKEDU MASTER School',
    priceLabel: '도입 상담',
    durationLabel: '학교·기관 도입 상담',
    serverPlanKey: null,
    serverAmount: null,
    autoRenewal: false,
    purchasable: false,
    contactRequired: true,
    comingSoon: false,
    statusLabel: '상담 상품',
    features: ['학교·기관 도입은 별도 상담으로 안내합니다.', '직접 결제 CTA를 제공하지 않습니다.'],
  },
};

export function getDirectPurchaseMasterProducts() {
  return Object.values(MASTER_PRODUCT_CATALOG).filter((product) => product.purchasable);
}

export function getMasterProduct(key: MasterProductKey) {
  return MASTER_PRODUCT_CATALOG[key];
}

export function getMasterProductRenewalLabel(product: MasterProductCatalogItem) {
  return product.autoRenewal ? '자동 갱신' : '자동 갱신 없음';
}

export function getMasterProductPriceWithDuration(product: MasterProductCatalogItem) {
  return `${product.priceLabel} / ${product.durationLabel}`;
}

export function getMasterProductActionLabel(product: MasterProductCatalogItem) {
  if (product.purchasable) return `${product.displayName.replace('SPOKEDU MASTER ', '')} 이용권 보기`;
  if (product.comingSoon) return product.statusLabel;
  if (product.contactRequired) return product.priceLabel;
  return product.statusLabel;
}

export function buildMasterSupportMailto(subject: string, body = '') {
  const query = new URLSearchParams({ subject });
  if (body.trim()) query.set('body', body);
  return `mailto:${MASTER_SUPPORT_EMAIL}?${query.toString()}`;
}
