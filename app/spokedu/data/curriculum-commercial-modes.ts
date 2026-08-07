import type { EvidenceSource } from './conversion-evidence';
import { getPublicProductContract } from './public-product-contract';
import { SPOKEDU_PATHS } from './site';

const publicProduct = getPublicProductContract();

export type CurriculumCommercialMode = 'package' | 'training' | 'master' | 'license';

export type CurriculumModeIntentId =
  | 'package_quote'
  | 'training_consult'
  | 'master_view'
  | 'master_org_inquiry'
  | 'license_consult'
  | 'free_start';

export type CurriculumFormDefaults = {
  leadMode: CurriculumCommercialMode;
  contentType?: string;
  purpose?: string;
  teacherTraining?: string;
  partnershipType?: string;
};

export type CurriculumModeAction = {
  intentId: CurriculumModeIntentId;
  label: string;
  href: string;
  trackingLabel: string;
  formDefaults?: CurriculumFormDefaults;
};

export type CurriculumModeConfig = {
  id: CurriculumCommercialMode;
  title: string;
  promise: string;
  audienceHint: string;
  deliverables: readonly string[];
  evidence: readonly EvidenceSource[];
  primaryAction: CurriculumModeAction;
  secondaryAction?: CurriculumModeAction;
  formDefaults?: CurriculumFormDefaults;
  sectionId: string;
};

export const CURRICULUM_COMMERCIAL_MODES: readonly CurriculumCommercialMode[] = [
  'package',
  'training',
  'master',
  'license',
] as const;

export function isCurriculumCommercialMode(value: string): value is CurriculumCommercialMode {
  return (CURRICULUM_COMMERCIAL_MODES as readonly string[]).includes(value);
}

export function curriculumModePath(mode: CurriculumCommercialMode): string {
  return `${SPOKEDU_PATHS.subscription}?mode=${mode}`;
}

export function curriculumModeSectionHref(mode: CurriculumCommercialMode): string {
  return `${curriculumModePath(mode)}#mode-${mode}`;
}

export const curriculumCommercialModes: Record<CurriculumCommercialMode, CurriculumModeConfig> = {
  package: {
    id: 'package',
    title: '자료·패키지',
    promise: '수업안·운영 매뉴얼을 현장 일정에 맞게 바로 적용할 수 있게 제안합니다.',
    audienceHint: '개인 지도자 · 기관 담당자',
    deliverables: ['수업안', '운영 매뉴얼', '프로그램 패키지'],
    evidence: [
      {
        type: 'history',
        historyId: 'emart-package',
        label: '이마트 문화센터 수업안·운영 패키지 공급',
      },
    ],
    primaryAction: {
      intentId: 'package_quote',
      label: '수업안·패키지 제안 받기',
      href: `${SPOKEDU_PATHS.subscription}?mode=package#inquiry`,
      trackingLabel: 'curriculum-mode-package-primary',
      formDefaults: {
        leadMode: 'package',
        contentType: '수업안',
        purpose: '내부 운영',
        teacherTraining: '선택',
        partnershipType: '단건 구매',
      },
    },
    secondaryAction: {
      intentId: 'master_view',
      label: '구독시스템 알아보기',
      href: `${SPOKEDU_PATHS.subscription}`,
      trackingLabel: 'curriculum-mode-package-secondary-master',
    },
    formDefaults: {
      leadMode: 'package',
      contentType: '수업안',
      purpose: '내부 운영',
      teacherTraining: '선택',
      partnershipType: '단건 구매',
    },
    sectionId: 'mode-package',
  },
  training: {
    id: 'training',
    title: '지도자 교육',
    promise: '지도자 세미나·SPOMOVE 도입·기관 컨설팅 범위를 맞춰 교육합니다.',
    audienceHint: '기관 담당자 · 지도자 교육 담당',
    deliverables: ['지도자 세미나', 'SPOMOVE 도입 교육', '기관 컨설팅'],
    evidence: [
      {
        type: 'history',
        historyId: 'gwangju-seminar',
        label: '광주광역시 체육 지도자 교육 세미나',
      },
      {
        type: 'history',
        historyId: 'seocho-seminar',
        label: '서초 강사 세미나·인큐베이팅',
      },
    ],
    primaryAction: {
      intentId: 'training_consult',
      label: '교육·도입 범위 상담하기',
      href: `${SPOKEDU_PATHS.subscription}?mode=training#inquiry`,
      trackingLabel: 'curriculum-mode-training-primary',
      formDefaults: {
        leadMode: 'training',
        contentType: '지도자 교육·세미나',
        purpose: '강사 교육',
        teacherTraining: '필요',
        partnershipType: '교육 위탁',
      },
    },
    formDefaults: {
      leadMode: 'training',
      contentType: '지도자 교육·세미나',
      purpose: '강사 교육',
      teacherTraining: '필요',
      partnershipType: '교육 위탁',
    },
    sectionId: 'mode-training',
  },
  master: {
    id: 'master',
    title: '구독시스템',
    promise: '수업을 찾고 준비하고 진행하고 기록하는 흐름을 하나로 연결합니다.',
    audienceHint: '지금 도구가 필요한 지도자',
    deliverables: [
      '수업 도구 (무료)',
      '수업 라이브러리 · 출석부 (Lite)',
      '수업 기록 · SPOMOVE (Premium)',
    ],
    evidence: [
      {
        type: 'product',
        href: publicProduct.handoff.landingHref,
        label: '구독시스템 제품 화면·이용 흐름',
      },
      {
        type: 'history',
        historyId: 'master-subscription',
        label: '강사용 구독 서비스 운영',
      },
    ],
    primaryAction: {
      intentId: 'free_start',
      label: '무료로 시작하기',
      href: publicProduct.handoff.freeStartHref,
      trackingLabel: 'curriculum-mode-master-primary',
    },
    secondaryAction: {
      intentId: 'master_view',
      label: '제품 화면 보기',
      href: publicProduct.handoff.landingHref,
      trackingLabel: 'curriculum-mode-master-secondary-landing',
    },
    formDefaults: {
      leadMode: 'master',
      contentType: '기타',
      purpose: '기관 도입',
      teacherTraining: '선택',
      partnershipType: '구독·정기',
    },
    sectionId: 'mode-master',
  },
  license: {
    id: 'license',
    title: '라이선스·파트너',
    promise: '프로그램 공급·라이선싱·파트너 운영 범위를 사업 조건에 맞춰 논의합니다.',
    audienceHint: '사업자 · 교육 파트너',
    deliverables: ['프로그램 라이선싱', '현지화·파트너 운영', '커리큘럼 공급'],
    evidence: [
      {
        type: 'missing',
        note: '공개 가능한 파트너 운영 사례는 상담 시 범위 확인 후 공유합니다.',
      },
    ],
    primaryAction: {
      intentId: 'license_consult',
      label: '라이선스·파트너 상담하기',
      href: `${SPOKEDU_PATHS.subscription}?mode=license#inquiry`,
      trackingLabel: 'curriculum-mode-license-primary',
      formDefaults: {
        leadMode: 'license',
        contentType: '프로그램 라이선싱',
        purpose: '구매·라이선스',
        teacherTraining: '상담 후 결정',
        partnershipType: '협업 검토',
      },
    },
    formDefaults: {
      leadMode: 'license',
      contentType: '프로그램 라이선싱',
      purpose: '구매·라이선스',
      teacherTraining: '상담 후 결정',
      partnershipType: '협업 검토',
    },
    sectionId: 'mode-license',
  },
};

export const curriculumModeList: readonly CurriculumModeConfig[] = CURRICULUM_COMMERCIAL_MODES.map(
  (id) => curriculumCommercialModes[id],
);

/** 기본 = 구독 허브(master). URL에 mode가 없으면 구독 랜딩. */
export function resolveCurriculumMode(
  raw: string | null | undefined,
  fallback: CurriculumCommercialMode = 'master',
): CurriculumCommercialMode {
  if (raw && isCurriculumCommercialMode(raw)) return raw;
  return fallback;
}

export function curriculumModeLabel(mode: CurriculumCommercialMode): string {
  return curriculumCommercialModes[mode].title;
}

export function curriculumSubmitLabel(mode: CurriculumCommercialMode): string {
  switch (mode) {
    case 'package':
      return '자료·패키지 제안 문의 접수';
    case 'training':
      return '교육·도입 문의 접수';
    case 'master':
      return '센터·기관 구독 문의 접수';
    case 'license':
      return '라이선스·파트너 문의 접수';
  }
}

/** mode 쿼리에 대응하는 스크롤 앵커 */
export function curriculumModeScrollTarget(mode: CurriculumCommercialMode): string {
  switch (mode) {
    case 'master':
      return 'plans';
    case 'training':
      return 'training';
    case 'license':
      return 'license';
    case 'package':
      return 'package';
  }
}
