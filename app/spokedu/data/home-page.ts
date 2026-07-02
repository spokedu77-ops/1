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

export type HomeAudienceGateItem = {
  id: string;
  title: string;
  description: string;
  bullets: readonly string[];
  href: string;
  trackLabel: string;
  mediaKey: HomeMediaKey;
};

export type HomeSpomoveFlowStep = {
  label: string;
  hint: string;
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
    lines: ['아이의 움직임을 설계하고,', '현장에서 검증합니다.'] as const,
    support:
      '연세대학교 체육교육학과 출신 운영진이 개인·소그룹 수업과 기관 프로그램을 직접 운영하며, SPOMOVE와 체육교육 커리큘럼을 개발합니다.',
    mediaKey: 'homeHero' as HomeMediaKey,
    primaryCta: {
      label: '프로그램 상담하기',
      href: `${SPOKEDU_BASE_PATH}/contact`,
      trackLabel: 'cta-home-contact-hero',
    },
    secondaryCta: {
      label: '운영 분야 보기',
      href: '#paths',
      trackLabel: 'cta-home-audience-gate-hero',
    },
  },
  proofStrip: {
    items: [
      '2020년부터 직접 운영',
      '연세대 체육교육학과 출신 운영진',
      '개인·기관·특수체육 현장 기반',
    ] as const,
  },
  audienceGate: {
    id: 'paths',
    title: '필요한 방식으로 시작하세요.',
    items: [
      {
        id: 'dispatch',
        title: '기관·센터',
        description: '학교·센터·복지관의 환경에 맞춘 정규·원데이 체육 프로그램',
        bullets: ['정규수업', '원데이·방학 프로그램'] as const,
        href: `${SPOKEDU_BASE_PATH}/dispatch`,
        trackLabel: 'cta-home-gate-dispatch',
        mediaKey: 'proofYangcheon',
      },
      {
        id: 'private',
        title: '개인·보호자',
        description: '아이의 운동 경험과 목표에 맞춘 1:1·소그룹 맞춤 수업',
        bullets: ['기초 움직임', '운동 자신감'] as const,
        href: `${SPOKEDU_BASE_PATH}/private`,
        trackLabel: 'cta-home-gate-private',
        mediaKey: 'homeHero',
      },
      {
        id: 'curriculum',
        title: '지도자·파트너',
        description: '현장 프로그램을 수업안·교육·협력 모델로 확장',
        bullets: ['커리큘럼', '강사교육'] as const,
        href: `${SPOKEDU_BASE_PATH}/curriculum`,
        trackLabel: 'cta-home-gate-curriculum',
        mediaKey: 'gateCurriculum',
      },
    ] satisfies HomeAudienceGateItem[],
  },
  spomove: {
    id: 'spomove',
    title: '보고, 고르고, 움직이며',
    titleLine2: '스스로 조절하는 체육교육',
    lead: '화면에 제시되는 색상·위치·방향·형태·리듬을 확인하고, 4색 패드와 다양한 신체활동으로 반응합니다. 연령과 대상에 따라 제시 속도, 시간, 동작과 규칙의 난이도를 조절할 수 있습니다.',
    flowSteps: [
      { label: '인지', hint: '화면 확인' },
      { label: '선택', hint: '반응 결정' },
      { label: '수행', hint: '몸으로 실행' },
      { label: '조절', hint: '속도·동작 조정' },
    ] as const satisfies readonly HomeSpomoveFlowStep[],
    mediaKey: 'trackDispatch' as HomeMediaKey,
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
  finalCta: {
    id: 'contact-cta',
    headlineLines: ['아이와 기관에 맞는', '체육 프로그램을 함께 설계합니다.'] as const,
    lead: '수업 대상과 운영 환경을 알려주시면 적합한 프로그램과 진행 방식을 안내합니다.',
    items: [
      {
        label: '기관 프로그램 문의',
        href: `${SPOKEDU_BASE_PATH}/contact?type=dispatch`,
        trackLabel: 'cta-home-final-dispatch',
      },
      {
        label: '개인수업 상담',
        href: `${SPOKEDU_BASE_PATH}/contact?type=private`,
        trackLabel: 'cta-home-final-private',
      },
      {
        label: '커리큘럼·협업 문의',
        href: `${SPOKEDU_BASE_PATH}/contact?type=curriculum`,
        trackLabel: 'cta-home-final-curriculum',
      },
    ] as const,
  },
} as const;

/** @deprecated site-ia.test 호환 */
export const homePageLegacyAudiencePaths = {
  id: 'paths',
  items: [] as const,
};
