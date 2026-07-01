import {
  catalogItemToHomeCard,
  getFieldRecordCatalogItem,
  type FieldRecordSlug,
} from './field-records-catalog';
import type { HomeMediaKey } from './home-media';
import { SPOKEDU_BASE_PATH } from './site';

export type HomeCaseCard = {
  slug: string;
  programType: string;
  programName: string;
  audience: string;
  description: string;
  href: string;
  ctaLabel: string;
  trackLabel: string;
  mediaKey: HomeMediaKey;
  blogImageIndex?: number;
};

export type HomeCoreBusinessItem = {
  id: string;
  title: string;
  description: string;
  href: string;
  cta: string;
  trackLabel: string;
  mediaKey: HomeMediaKey;
  /** 레이아웃 비중 — large가 기관·SPOMOVE */
  size: 'large' | 'compact';
};

/** 메인 홈 운영 사례 3건 — 카탈로그 원천 데이터만 사용 */
export const HOME_MAIN_CASE_SLUGS: readonly FieldRecordSlug[] = [
  'maedong-sports-stepup',
  'dasarang-oneday',
  'dongjak-spomove',
] as const;

function buildHomeCaseCard(slug: FieldRecordSlug): HomeCaseCard {
  const item = getFieldRecordCatalogItem(slug);
  const card = catalogItemToHomeCard(item);
  return {
    slug: card.slug,
    programType: item.operationType,
    programName: item.programLabel,
    audience: item.meta,
    description: item.description,
    href: card.href,
    ctaLabel: '자세히 보기',
    trackLabel: card.trackLabel,
    mediaKey: card.mediaKey,
    blogImageIndex: card.blogImageIndex,
  };
}

export const homePage = {
  hero: {
    id: 'hero',
    lines: ['전문성과 현장 경험으로', '아동·청소년의 움직임을', '설계합니다.'] as const,
    support:
      '스포키듀는 개인·소그룹 수업, 기관 출강, 특수체육과 시지각 기반 에듀테크 프로그램 SPOMOVE를 운영하는 아동·청소년 체육교육 브랜드입니다.',
    mediaKey: 'homeHeroWide' as HomeMediaKey,
    primaryCta: {
      label: '기관 프로그램 문의',
      href: `${SPOKEDU_BASE_PATH}/contact?type=dispatch`,
      trackLabel: 'cta-home-dispatch-hero',
    },
    secondaryCta: {
      label: 'SPOMOVE 알아보기',
      href: `${SPOKEDU_BASE_PATH}/programs/spomove`,
      trackLabel: 'cta-home-spomove-hero',
    },
    tertiaryLink: {
      label: '개인·소그룹 수업 알아보기',
      href: `${SPOKEDU_BASE_PATH}/private`,
      trackLabel: 'cta-home-private-hero',
    },
  },
  trust: {
    id: 'trust',
    eyebrow: 'WHY SPOKEDU',
    titleLines: ['현장에서 쌓아온', '체육교육의 기준'] as const,
    lead: '수업 운영 경험과 체육교육 전문성을 바탕으로 아이와 기관에 맞는 프로그램을 직접 설계하고 운영합니다.',
    items: [
      { headline: '2020년 설립', support: '아동·청소년 체육교육 브랜드로 운영합니다.' },
      { headline: '체육교육 전공 운영진', support: '수업 설계부터 현장 진행까지 전문 인력이 담당합니다.' },
      { headline: '개인수업과 기관 프로그램 직접 운영', support: '외주가 아닌 운영진이 직접 수업을 진행합니다.' },
      { headline: '일반아동·특수아동 프로그램 운영', support: '대상과 환경에 맞춘 난이도와 참여 방식을 설계합니다.' },
      { headline: '자체 에듀테크 체육 프로그램 SPOMOVE 개발', support: '시지각 기반 체육 프로그램을 자체 개발·운영합니다.' },
    ] as const,
  },
  coreBusiness: {
    id: 'business',
    items: [
      {
        id: 'dispatch',
        title: '기관 출강',
        description:
          '학교, 키움센터, 지역아동센터, 복지관, 기업과 공공기관을 대상으로 운영하는 정규·원데이·방학 프로그램입니다.',
        href: `${SPOKEDU_BASE_PATH}/dispatch`,
        cta: '기관 출강 보기',
        trackLabel: 'cta-home-business-dispatch',
        mediaKey: 'proofYangcheon',
        size: 'large',
      },
      {
        id: 'spomove',
        title: 'SPOMOVE',
        description:
          '화면의 색·위치·방향·리듬을 확인하고 4색 패드 위에서 몸으로 수행하는 시지각 기반 에듀테크 체육입니다.',
        href: `${SPOKEDU_BASE_PATH}/programs/spomove`,
        cta: 'SPOMOVE 보기',
        trackLabel: 'cta-home-business-spomove',
        mediaKey: 'proofClass',
        size: 'large',
      },
      {
        id: 'private',
        title: '개인·소그룹 수업',
        description:
          '아이의 운동 경험과 목표에 맞춘 1:1 및 2~4인 맞춤 체육수업으로 기초 움직임과 운동 자신감을 다룹니다.',
        href: `${SPOKEDU_BASE_PATH}/private`,
        cta: '개인수업 보기',
        trackLabel: 'cta-home-business-private',
        mediaKey: 'trackPrivate',
        size: 'compact',
      },
      {
        id: 'curriculum',
        title: '커리큘럼·지도자 교육',
        description:
          '현장 수업을 기반으로 제작한 수업안, 운영 매뉴얼, 지도자 교육과 기관 맞춤 콘텐츠를 제공합니다.',
        href: `${SPOKEDU_BASE_PATH}/curriculum`,
        cta: '커리큘럼 보기',
        trackLabel: 'cta-home-business-curriculum',
        mediaKey: 'gateCurriculum',
        size: 'compact',
      },
    ] satisfies HomeCoreBusinessItem[],
  },
  spomove: {
    id: 'spomove',
    title: '보고, 선택하고, 수행하며',
    titleLine2: '움직임을 조절하는 체육교육',
    lead: '화면에 제시되는 색상·위치·방향·형태·리듬을 확인하고, 4색 패드와 다양한 신체활동으로 반응합니다. 연령과 대상에 따라 제시 속도, 시간, 동작과 규칙의 난이도를 조절할 수 있습니다.',
    flow: ['인지', '선택', '수행', '조절'] as const,
    mediaKey: 'programSpomove' as HomeMediaKey,
    primaryCta: {
      label: 'SPOMOVE 자세히 보기',
      href: `${SPOKEDU_BASE_PATH}/programs/spomove`,
      trackLabel: 'cta-home-spomove-section',
    },
    secondaryCta: {
      label: '기관 도입 문의',
      href: `${SPOKEDU_BASE_PATH}/contact?type=spomove`,
      trackLabel: 'cta-home-spomove-dispatch',
    },
  },
  cases: {
    id: 'cases',
    title: '실제 운영 사례',
    lead: '현장에서 운영한 프로그램의 기록입니다.',
    cards: HOME_MAIN_CASE_SLUGS.map(buildHomeCaseCard),
  },
  operation: {
    id: 'operation',
    titleLines: ['현장을 이해하는 것에서', '좋은 수업이 시작됩니다.'] as const,
    lead: '대상과 환경을 먼저 분석하고, 직접 운영하며 얻은 피드백을 다음 프로그램에 반영합니다.',
    mediaKey: 'proofCenter' as HomeMediaKey,
    steps: [
      {
        label: '현장과 대상 분석',
        body: '기관과 개인의 공간, 연령, 참여 특성을 파악합니다.',
      },
      {
        label: '프로그램 설계 및 직접 운영',
        body: '분석을 바탕으로 수업안을 설계하고 현장에서 직접 운영합니다.',
      },
      {
        label: '피드백 반영과 프로그램 고도화',
        body: '현장 피드백을 반영해 수업과 프로그램을 지속적으로 개선합니다.',
      },
    ] as const,
  },
  finalCta: {
    id: 'contact-cta',
    headlineLines: ['아이와 기관에 맞는', '체육 프로그램을 함께 설계합니다.'] as const,
    lead: '수업 대상과 운영 환경을 알려주시면 적합한 프로그램과 진행 방식을 안내해 드립니다.',
    mediaKey: 'heroThumbMedia' as HomeMediaKey,
    primary: {
      label: '개인수업 상담',
      href: `${SPOKEDU_BASE_PATH}/contact?type=private`,
      trackLabel: 'cta-home-final-private',
    },
    secondary: {
      label: '기관 출강 문의',
      href: `${SPOKEDU_BASE_PATH}/contact?type=dispatch`,
      trackLabel: 'cta-home-final-dispatch',
    },
    tertiary: {
      label: 'SPOMOVE 도입 문의',
      href: `${SPOKEDU_BASE_PATH}/contact?type=spomove`,
      trackLabel: 'cta-home-final-spomove',
    },
  },
} as const;

/** @deprecated site-ia.test 호환 */
export const homePageLegacyAudiencePaths = {
  id: 'paths',
  items: [] as const,
};
