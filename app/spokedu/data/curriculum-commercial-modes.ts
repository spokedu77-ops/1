import type { EvidenceSource } from './conversion-evidence';
import { SPOKEDU_BASE_PATH } from './site';

export type CurriculumCommercialMode = 'package' | 'training' | 'master' | 'license';

export type CurriculumModeIntentId =
  | 'package_quote'
  | 'training_consult'
  | 'master_view'
  | 'master_org_inquiry'
  | 'license_consult';

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
  return `${SPOKEDU_BASE_PATH}/curriculum?mode=${mode}`;
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
      href: `${SPOKEDU_BASE_PATH}/curriculum?mode=package#inquiry`,
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
      label: 'SPOKEDU MASTER 보기',
      href: '/spokedu-master/landing',
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
    title: '교육·도입',
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
      href: `${SPOKEDU_BASE_PATH}/curriculum?mode=training#inquiry`,
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
    title: 'SPOKEDU MASTER',
    promise: '매주 쓸 수업안·SPOMOVE 실행·설명 문구를 한곳에서 운영하는 구독 도구입니다.',
    audienceHint: '지금 도구가 필요한 지도자',
    deliverables: ['프로그램 라이브러리', 'SPOMOVE 큰 화면 실행', '수업 기록', '설명 문구'],
    evidence: [
      {
        type: 'product',
        href: '/spokedu-master/landing',
        label: 'MASTER 제품 페이지·이용 흐름',
      },
      {
        type: 'history',
        historyId: 'master-subscription',
        label: '강사용 구독 서비스 운영',
      },
    ],
    primaryAction: {
      intentId: 'master_view',
      label: 'SPOKEDU MASTER 살펴보기',
      href: '/spokedu-master/landing',
      trackingLabel: 'curriculum-mode-master-primary',
    },
    secondaryAction: {
      intentId: 'master_org_inquiry',
      label: '기관·단체 이용 문의',
      href: `${SPOKEDU_BASE_PATH}/curriculum?mode=master#inquiry`,
      trackingLabel: 'curriculum-mode-master-secondary',
      formDefaults: {
        leadMode: 'master',
        contentType: '기타',
        purpose: '기관 도입',
        teacherTraining: '선택',
        partnershipType: '구독·정기',
      },
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
      href: `${SPOKEDU_BASE_PATH}/curriculum?mode=license#inquiry`,
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

export function resolveCurriculumMode(
  raw: string | null | undefined,
  fallback: CurriculumCommercialMode = 'training',
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
      return 'MASTER 기관·단체 이용 문의 접수';
    case 'license':
      return '라이선스·파트너 문의 접수';
  }
}
