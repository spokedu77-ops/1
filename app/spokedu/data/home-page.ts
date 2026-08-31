import {
  catalogItemToHomeCard,
  getFieldRecordCatalogItem,
  type FieldRecordSlug,
} from './field-records-catalog';
import type { HomeMediaKey } from './home-media';
import { SPOKEDU_PATHS } from './site';

export const HOME_FIELD_EDITORIAL = {
  hero: '/images/spokedu/home/field-editorial/home-hero-field.webp',
  why: '/images/spokedu/home/field-editorial/home-why-field.webp',
  spomove: '/images/spokedu/home/field-editorial/home-spomove-field.webp',
  caseGeneral: '/images/spokedu/home/field-editorial/home-case-general.webp',
  caseAdapted: '/images/spokedu/home/field-editorial/home-case-adapted.webp',
  caseSpomove: '/images/spokedu/home/field-editorial/home-case-spomove.webp',
} as const;

export type HomeCaseCard = {
  slug: string;
  venue: string;
  programType: string;
  programName: string;
  audience: string;
  description: string;
  href: string;
  ctaLabel: string;
  trackLabel: string;
  mediaKey: HomeMediaKey;
  editorialSrc: string;
  editorialObjectPosition?: string;
  blogImageIndex?: number;
  thumbnailSrc?: string;
};

export const HOME_FEATURED_CASE_SLUG: FieldRecordSlug = 'maedong-sports-stepup';
export const HOME_MAIN_CASE_SLUGS: readonly FieldRecordSlug[] = [
  'maedong-sports-stepup',
  'donghaeng-special-pe',
  'dongjak-spomove',
] as const;

function buildHomeCaseCard(
  slug: FieldRecordSlug,
  editorial: { src: string; objectPosition?: string },
): HomeCaseCard {
  const item = getFieldRecordCatalogItem(slug);
  const card = catalogItemToHomeCard(item);
  return {
    slug: card.slug,
    venue: item.venue,
    programType: item.operationType,
    programName: item.programLabel,
    audience: item.meta,
    description: item.description,
    href: card.href,
    ctaLabel: '사례 보기',
    trackLabel: card.trackLabel,
    mediaKey: card.mediaKey,
    editorialSrc: editorial.src,
    editorialObjectPosition: editorial.objectPosition,
    blogImageIndex: card.blogImageIndex,
    thumbnailSrc: card.thumbnailSrc,
  };
}

export const homePage = {
  sectionOrder: ['hero', 'choice', 'why', 'spomove', 'subscription', 'cases', 'contact'] as const,

  hero: {
    id: 'hero',
    lines: ['아동·청소년 체육수업을', '직접 설계하고 운영합니다.'] as const,
    support:
      '학교·기관부터 개인·소그룹까지 현장에 맞는 체육수업을 직접 운영하고, 그 과정에서 필요한 콘텐츠와 지도자용 수업 시스템도 만듭니다.',
    mediaKey: 'homeHeroField' as HomeMediaKey,
    brand: 'SPOKEDU',
    primaryCta: {
      label: '체육수업 알아보기',
      href: SPOKEDU_PATHS.education,
      trackLabel: 'cta-home-education-hero',
    },
    secondaryCta: {
      label: '구독시스템 알아보기',
      href: SPOKEDU_PATHS.subscription,
      trackLabel: 'cta-home-subscription-hero',
    },
    tertiaryCta: {
      label: '운영 사례 보기',
      href: SPOKEDU_PATHS.records,
      trackLabel: 'cta-home-hero-records',
    },
  },

  choice: {
    id: 'choice',
    title: '수업을 맡기거나, 직접 운영하세요.',
    education: {
      headline: '체육수업',
      tagline: 'SPOKEDU가 직접 수업합니다.',
      body: '학교·기관·개인·소그룹의 대상과 환경에 맞춰 수업을 구성하고 운영합니다.',
      primaryCta: {
        label: '체육수업 알아보기',
        href: SPOKEDU_PATHS.education,
        trackLabel: 'cta-home-choice-education',
      },
    },
    subscription: {
      headline: '구독시스템',
      tagline: '지도자가 직접 수업할 수 있도록 돕습니다.',
      body: '놀이체육 콘텐츠와 SPOMOVE를 활용해 수업을 준비하고 진행하고 기록할 수 있습니다.',
      primaryCta: {
        label: '구독시스템 알아보기',
        href: SPOKEDU_PATHS.subscription,
        trackLabel: 'cta-home-choice-subscription',
      },
    },
  },

  why: {
    id: 'why',
    title: '직접 수업하며 만듭니다.',
    body:
      '실제 수업에 필요한 활동을 직접 설계하고 적용합니다. 수업에서 다듬은 내용을 프로그램과 콘텐츠로 만듭니다.',
    mediaKey: 'homeWhyField' as HomeMediaKey,
  },

  spomove: {
    id: 'spomove',
    label: 'SPOMOVE',
    title: '보고, 판단하고,\n움직입니다.',
    body: '화면의 정보를 보고 판단한 뒤\n움직임으로 반응하는\nSPOKEDU의 자체 신체활동 콘텐츠입니다.',
    flow: ['화면 확인', '규칙 판단', '움직임'] as const,
    mediaKey: 'homeSpomoveField' as HomeMediaKey,
    primaryCta: {
      label: 'SPOMOVE 자세히 보기',
      href: SPOKEDU_PATHS.spomove,
      trackLabel: 'cta-home-spomove-learn',
    },
  },

  subscription: {
    id: 'subscription',
    title: '오늘 수업을 찾고, 준비하고, 바로 운영하세요.',
    lead: '놀이체육 콘텐츠와 SPOMOVE를 찾고, 수업 준비부터 진행·기록까지 한곳에서 이어갈 수 있습니다.',
    flow: ['찾기', '준비', '진행', '기록'] as const,
    visual: {
      src: '/images/spokedu/subscription/product-library.png',
      alt: '스포키듀 구독시스템 수업 라이브러리 — 바로 쓸 수업 고르기',
    },
    primaryCta: {
      label: '구독시스템 알아보기',
      href: SPOKEDU_PATHS.subscription,
      trackLabel: 'cta-home-subscription-learn',
    },
  },

  cases: {
    id: 'cases',
    title: '실제 운영 현장',
    lead: 'SPOKEDU가 직접 운영한\n수업과 프로그램 기록입니다.',
    recordsCta: {
      label: '운영 사례 전체 보기',
      href: SPOKEDU_PATHS.records,
      trackLabel: 'cta-home-cases-records',
    },
    cards: [
      buildHomeCaseCard('maedong-sports-stepup', {
        src: HOME_FIELD_EDITORIAL.caseGeneral,
        objectPosition: '50% 45%',
      }),
      buildHomeCaseCard('donghaeng-special-pe', {
        src: HOME_FIELD_EDITORIAL.caseAdapted,
        objectPosition: '55% 48%',
      }),
      buildHomeCaseCard('dongjak-spomove', {
        src: HOME_FIELD_EDITORIAL.caseSpomove,
        objectPosition: '50% 42%',
      }),
    ],
  },

  contact: {
    id: 'contact',
    title: '수업이나 활용 방법을 상담해보세요.',
    lead: '기관·학교 체육수업부터 SPOMOVE와 구독시스템 활용까지 상황에 맞게 안내합니다.',
    primaryCta: {
      label: '문의하기',
      href: SPOKEDU_PATHS.contact,
      trackLabel: 'cta-home-contact-primary',
    },
  },
} as const;
