import type { HomeMediaKey } from './home-media';
import type { SpokeduImageKind, SpokeduImageProgram } from './images';
import { getPublicProductContract } from './public-product-contract';
import { SPOKEDU_BASE_PATH } from './site';

type CurriculumMediaRequirement = {
  page: 'curriculum';
  program: SpokeduImageProgram;
  kind: SpokeduImageKind;
  allowVisualFallback?: boolean;
};

const publicProduct = getPublicProductContract();

const CONTENT_SCOPE_ITEMS = [
  {
    title: '놀이체육·수업 라이브러리',
    description: '현장에서 바로 고를 수 있는 수업 자료를 라이브러리에서 찾습니다. (Lite·Premium)',
    mediaKey: 'curriculumPlan' as HomeMediaKey,
    mediaRequirement: {
      page: 'curriculum',
      program: 'curriculum',
      kind: 'document',
      allowVisualFallback: true,
    } satisfies CurriculumMediaRequirement,
  },
  {
    title: '수업 도구',
    description: '로그인 후 무료로 써 볼 수 있는 현장 진행 도구입니다. (무료·Lite·Premium)',
    mediaKey: 'curriculumManual' as HomeMediaKey,
    mediaRequirement: {
      page: 'curriculum',
      program: 'curriculum',
      kind: 'document',
      allowVisualFallback: true,
    } satisfies CurriculumMediaRequirement,
  },
  {
    title: 'SPOMOVE',
    description: '스크린 신호 기반 반응 활동입니다. 구독시스템 Premium에서 이용할 수 있습니다.',
    mediaKey: 'curriculumTraining' as HomeMediaKey,
    mediaRequirement: {
      page: 'curriculum',
      program: 'curriculum',
      kind: 'field-photo',
    } satisfies CurriculumMediaRequirement,
  },
  {
    title: '수업 기록',
    description: '반응·기록·안내문 흐름을 누적합니다. (Premium)',
    mediaKey: 'curriculumPackage' as HomeMediaKey,
    mediaRequirement: {
      page: 'curriculum',
      program: 'curriculum',
      kind: 'document',
      allowVisualFallback: true,
    } satisfies CurriculumMediaRequirement,
  },
] as const;

/**
 * `/spokedu/curriculum` = 스포키듀 구독시스템 설득 허브.
 * 가격·플랜 숫자는 public-product-contract에서만 읽는다.
 */
export const curriculumPage = {
  sectionOrder: [
    'hero',
    'audience',
    'classFlow',
    'contentScope',
    'plans',
    'spomoveRelation',
    'handoffSecondary',
  ] as const,

  hero: {
    id: 'hero',
    mediaKey: 'trackCurriculum' as HomeMediaKey,
    eyebrow: publicProduct.productDisplayName,
    title: '수업을 찾고 준비하고 진행하고 기록하는 흐름을 하나로 연결합니다.',
    lead:
      '지도자가 매 수업마다 하는 프로그램 찾기, 준비, 현장 진행, 반응 기록, 다음 수업 연결을 구독시스템에서 이어 갑니다.',
    primaryCta: {
      label: '무료로 시작하기',
      href: publicProduct.handoff.freeStartHref,
      trackLabel: 'curriculum-hero-free-start',
      ctaIntentId: 'free_start',
    },
    secondaryCta: {
      label: '제품 화면 보기',
      href: publicProduct.handoff.landingHref,
      trackLabel: 'curriculum-hero-product-view',
      ctaIntentId: 'master_handoff',
    },
  },

  audience: {
    id: 'audience',
    eyebrow: '대상',
    title: '누구를 위한 제품인가',
    lead: '수업을 직접 준비하고 진행하는 지도자·강사·센터 운영자가 주 대상입니다. 기관 프로그램 위탁은 체육교육 경로로 안내합니다.',
    primary: [
      {
        title: '체육 지도자',
        body: '매주 쓸 수업을 찾고 현장에서 진행·기록하려는 지도자',
      },
      {
        title: '기관 체육 강사',
        body: '기관 일정에 맞춰 수업 자료와 진행 도구가 필요한 강사',
      },
      {
        title: '센터 운영자',
        body: '수업 콘텐츠와 출석·기록을 같은 흐름으로 관리하려는 운영자',
      },
    ] as const,
    secondary: {
      title: '기관 담당자이신가요?',
      body: '기관 체육교육·파견 운영은 구독 Primary가 아닙니다. 체육교육 허브에서 기관수업을 확인하세요.',
      href: `${SPOKEDU_BASE_PATH}/education`,
      ctaLabel: '체육교육 알아보기',
      trackLabel: 'curriculum-audience-education',
      ctaIntentId: 'education_hub',
    },
  },

  classFlow: {
    id: 'flow',
    eyebrow: '수업 흐름',
    title: '수업 전 → 수업 중 → 수업 후',
    lead: '구독시스템이 지원하는 수업 운영 흐름입니다. 플랜별 제공 범위는 아래에서 확인합니다.',
    steps: [
      {
        phase: '수업 전',
        title: '수업 검색',
        body: '태그와 검색으로 오늘 쓸 수업을 고릅니다.',
      },
      {
        phase: '수업 전',
        title: '수업 준비',
        body: '수업 구성과 진행 기준을 확인합니다.',
      },
      {
        phase: '수업 중',
        title: '현장 진행',
        body: '수업 도구로 현장에서 활동을 진행합니다.',
      },
      {
        phase: '수업 후',
        title: '반응 기록',
        body: '수업 반응과 기록을 남깁니다. (Premium)',
      },
      {
        phase: '연결',
        title: '다음 수업 연결',
        body: '기록과 라이브러리를 다음 수업 준비에 이어 씁니다.',
      },
    ] as const,
  },

  contentScope: {
    id: 'content',
    eyebrow: '콘텐츠',
    title: '오늘 수업을 준비하는 행동이 줄어듭니다',
    lead: '자료 나열이 아니라, 찾기·준비·진행·기록에 바로 쓰는 범위로 제공합니다.',
    items: CONTENT_SCOPE_ITEMS,
  },

  /** 미디어 계약 테스트·레거시 참조 — contentScope와 동일 원천 */
  contentProducts: {
    eyebrow: '콘텐츠',
    title: '오늘 수업을 준비하는 행동이 줄어듭니다',
    lead: '자료 나열이 아니라, 찾기·준비·진행·기록에 바로 쓰는 범위로 제공합니다.',
    items: CONTENT_SCOPE_ITEMS,
  },

  plans: {
    id: 'plans',
    eyebrow: '플랜',
    title: 'Free · Lite · Premium',
    lead: '실제 판매 중인 월 구독만 표시합니다. 연간 결제는 현재 판매하지 않습니다.',
    annualNote: '연간 결제: 현재 판매하지 않음',
    centerNote: '센터·기관은 Free/Lite/Premium과 동급 플랜이 아닙니다. 별도 이용 문의로 안내합니다.',
    spomatNote: `SPOMAT는 ${publicProduct.spomat.confirmLabel}. Premium에서 회원가 자격이 열립니다.`,
  },

  spomoveRelation: {
    id: 'spomove',
    eyebrow: 'SPOMOVE',
    title: 'SPOMOVE는 구독시스템 안의 콘텐츠입니다',
    lead: '구독시스템 전체가 SPOMOVE는 아닙니다. SPOMOVE는 Premium에서 이용할 수 있는 콘텐츠이며, 스포키듀 직접 체육교육에서도 활용됩니다.',
    points: [
      '구독시스템 ≠ SPOMOVE',
      'Premium에서 SPOMOVE 이용',
      '체육교육 현장에서도 SPOMOVE 활용',
    ] as const,
    primary: {
      label: 'SPOMOVE 알아보기',
      href: `${SPOKEDU_BASE_PATH}/programs/spomove`,
      trackLabel: 'curriculum-spomove-learn',
      ctaIntentId: 'spomove_subscription',
    },
  },

  handoffSecondary: {
    id: 'handoff',
    eyebrow: '시작 · 문의',
    title: '제품에서 시작하고, 교육·라이선스는 아래에서',
    lead: '구독 Primary는 제품 handoff입니다. 지도자 교육·커리큘럼 라이선스는 Secondary로 이어집니다.',
    primary: {
      label: '무료로 시작하기',
      href: publicProduct.handoff.freeStartHref,
      trackLabel: 'curriculum-handoff-free-start',
      ctaIntentId: 'free_start',
    },
    secondary: {
      label: '제품 화면 보기',
      href: publicProduct.handoff.landingHref,
      trackLabel: 'curriculum-handoff-landing',
      ctaIntentId: 'master_handoff',
    },
    login: {
      label: '로그인',
      href: publicProduct.handoff.loginHref,
      trackLabel: 'curriculum-handoff-login',
      ctaIntentId: 'master_handoff',
    },
  },

  /** mode=training 섹션 — Secondary */
  trainingTracks: {
    id: 'training',
    eyebrow: '지도자 교육',
    title: '지도자 교육 · 세미나',
    lead: '구독과 별도로, 세미나·도입 교육·기관 컨설팅을 문의할 수 있습니다.',
    items: [
      { title: '놀이체육 세미나', body: '수업 설계 기준과 현장 운영 언어를 공유합니다.' },
      { title: 'SPOMOVE 도입 교육', body: '스크린 신호·패드 운영·난이도 조절을 함께 익힙니다.' },
      { title: '교구 활용 교육', body: '준비물·동선·안전 기준을 실습 중심으로 정리합니다.' },
      { title: '기관 컨설팅', body: '정규·원데이·방학 운영안을 기관 조건에 맞춰 제안합니다.' },
    ] as const,
    cta: {
      label: '지도자 교육 문의',
      href: `${SPOKEDU_BASE_PATH}/curriculum?mode=training#inquiry`,
      trackLabel: 'curriculum-training-inquiry',
    },
  },

  /** mode=license / package 보조 설명 */
  secondaryIntents: {
    license: {
      id: 'license',
      eyebrow: '커리큘럼·라이선스',
      title: '커리큘럼 · 라이선스 · 파트너',
      lead: '프로그램 공급·라이선싱·파트너 운영은 구독 플랜이 아닙니다. 별도 상담으로 이어집니다.',
      ctaLabel: '라이선스·파트너 문의',
      href: `${SPOKEDU_BASE_PATH}/curriculum?mode=license#inquiry`,
      trackLabel: 'curriculum-license-inquiry',
    },
    package: {
      id: 'package',
      eyebrow: '자료·패키지',
      title: '구독 콘텐츠와 자료·패키지',
      lead: '수업안·운영 매뉴얼 등 단건 자료·패키지 제안은 구독 허브의 콘텐츠 범위와 연결해 안내합니다.',
      ctaLabel: '자료·패키지 문의',
      href: `${SPOKEDU_BASE_PATH}/curriculum?mode=package#inquiry`,
      trackLabel: 'curriculum-package-inquiry',
    },
  },

  serviceExamples: {
    id: 'history',
    eyebrow: '운영 이력',
    title: '현장에서 이어 온 교육·콘텐츠 이력',
    lead: '세미나·커리큘럼·구독 도구까지, 현장 기준을 교육과 콘텐츠로 확장한 기록입니다.',
    items: [
      {
        id: 'gwangju-seminar',
        title: '광주광역시 체육 지도자 교육 세미나',
        date: '2026. 07. 16',
        venue: '스포키듀 / 스포키듀LAB',
        description: '광주광역시 체육 지도자를 대상으로 수업 설계·현장 운영 기준을 공유한 교육 세미나입니다.',
        status: '운영 완료',
        mediaKey: 'curriculumTraining' as HomeMediaKey,
        mediaRequirement: {
          page: 'curriculum',
          program: 'curriculum',
          kind: 'field-photo',
        } satisfies CurriculumMediaRequirement,
      },
      {
        id: 'seocho-seminar',
        title: '강사 세미나',
        date: '2023. 10~12',
        venue: '서초여성가족플라자',
        description: '아동체육 인큐베이팅 강의 — 파트너 강사 대상 수업 설계·현장 운영 기준을 공유했습니다.',
        status: '운영 완료',
        mediaKey: 'curriculumTraining' as HomeMediaKey,
        mediaRequirement: {
          page: 'curriculum',
          program: 'curriculum',
          kind: 'field-photo',
        } satisfies CurriculumMediaRequirement,
      },
      {
        id: 'emart-package',
        title: '커리큘럼 판매',
        date: '2025. 03',
        venue: '이마트 문화센터',
        description: '미니올림픽 특강 수업안·운영 패키지 — 서울·경기·대전 문화센터에 맞춘 구성을 제공했습니다.',
        status: '판매·적용',
        mediaKey: 'curriculumPackage' as HomeMediaKey,
        mediaRequirement: {
          page: 'curriculum',
          program: 'curriculum',
          kind: 'document',
          allowVisualFallback: true,
        } satisfies CurriculumMediaRequirement,
      },
      {
        id: 'master-subscription',
        title: '구독 서비스',
        date: '2026',
        venue: publicProduct.productDisplayName,
        description: '강사용 수업 운영 플랫폼 — 프로그램 라이브러리, 스크린 실행, 수업 기록을 한곳에서 제공합니다.',
        status: '서비스 중',
        mediaKey: 'curriculumMaster' as HomeMediaKey,
        mediaRequirement: {
          page: 'curriculum',
          program: 'curriculum',
          kind: 'screen',
          allowVisualFallback: true,
        } satisfies CurriculumMediaRequirement,
        href: publicProduct.handoff.landingHref,
      },
    ],
  },

  /** Secondary 교육·라이선스 문의용 한 장 (구독 Primary와 분리) */
  processOnePager: {
    eyebrow: '교육·라이선스 문의',
    title: '교육·라이선스 문의부터 제안까지',
    lead: '구독 시작과 별도로, 교육·자료·라이선스 범위를 알려주시면 맞춤 안내를 드립니다.',
    flow: [
      { label: '문의', detail: '웹 폼·상담으로 목적과 대상을 접수합니다.' },
      { label: '범위 확인', detail: '교육·자료·라이선싱 중 필요한 축을 정합니다.' },
      { label: '맞춤 제안', detail: '현장 조건에 맞는 교육·콘텐츠 구성을 제안합니다.' },
      { label: '교육·납품', detail: '세미나·자료·도입 교육을 일정에 맞춰 진행합니다.' },
    ] as const,
    checklist: {
      title: '문의 전에 알려주시면 빠른 제안',
      items: ['대상 (강사·기관·파트너)', '필요한 콘텐츠 범위', '희망 일정·인원', 'SPOMOVE 도입 여부'] as const,
    },
    formats: {
      title: '가능한 형태',
      items: ['수업안·매뉴얼', '지도자 세미나', 'SPOMOVE 도입 교육', '라이선싱'] as const,
    },
    cta: {
      label: '교육·라이선스 문의',
      href: '#inquiry',
    },
  },

  finalCta: {
    title: '오늘 수업 준비부터 구독시스템에서 시작하세요',
    description: '무료로 수업 도구를 써 보거나, 제품 화면에서 Lite·Premium 범위를 확인할 수 있습니다.',
    mediaKey: 'curriculumMaster' as HomeMediaKey,
    primary: {
      label: '무료로 시작하기',
      href: publicProduct.handoff.freeStartHref,
      trackLabel: 'curriculum-final-free-start',
      ctaIntentId: 'free_start',
    },
    secondary: {
      label: '제품 화면 보기',
      href: publicProduct.handoff.landingHref,
      trackLabel: 'curriculum-final-landing',
      ctaIntentId: 'master_handoff',
    },
  },
} as const;
