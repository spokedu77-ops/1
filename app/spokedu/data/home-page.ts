import {
  catalogItemToHomeCard,
  getFieldRecordCatalogItem,
  type FieldRecordSlug,
} from './field-records-catalog';
import type { HomeMediaKey } from './home-media';
import { SPOKEDU_PATHS } from './site';

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
  blogImageIndex?: number;
  thumbnailSrc?: string;
};

export const HOME_FEATURED_CASE_SLUG: FieldRecordSlug = 'maedong-sports-stepup';
export const HOME_MAIN_CASE_SLUGS: readonly FieldRecordSlug[] = [
  'maedong-sports-stepup',
  'donghaeng-special-pe',
  'dongjak-spomove',
] as const;

function buildHomeCaseCard(slug: FieldRecordSlug): HomeCaseCard {
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
    blogImageIndex: card.blogImageIndex,
    thumbnailSrc: card.thumbnailSrc,
  };
}

export const homePage = {
  sectionOrder: ['hero', 'choice', 'why', 'spomove', 'subscription', 'cases', 'final-action'] as const,

  hero: {
    id: 'hero',
    lines: ['아동·청소년 체육수업을', '직접 설계하고 운영합니다.'] as const,
    support:
      '학교·기관부터 개인·소그룹까지 현장에 맞는 체육수업을 직접 운영하고, 그 과정에서 필요한 콘텐츠와 지도자용 수업 시스템도 만듭니다.',
    mediaKey: 'homeHero' as HomeMediaKey,
    brand: 'SPOKEDU',
    primaryCta: {
      label: '체육교육 알아보기',
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
      headline: '체육교육',
      tagline: 'SPOKEDU가 직접 운영합니다.',
      body: '학교·기관·개인의 조건에 맞춰 체육수업을 설계하고 진행합니다.',
      primaryCta: {
        label: '체육교육 알아보기',
        href: SPOKEDU_PATHS.education,
        trackLabel: 'cta-home-choice-education',
      },
      links: [
        {
          label: '기관수업',
          href: SPOKEDU_PATHS.dispatch,
          trackLabel: 'cta-home-choice-dispatch',
        },
        {
          label: '개인·소그룹',
          href: SPOKEDU_PATHS.private,
          trackLabel: 'cta-home-choice-private',
        },
      ] as const,
    },
    subscription: {
      headline: '구독시스템',
      tagline: '지도자가 직접 운영할 수 있도록 제공합니다.',
      body: '놀이체육 콘텐츠와 SPOMOVE를 선택하고 수업을 준비·진행·기록할 수 있습니다.',
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
    body: '실제 체육수업에서 활동을 사용하고 수정하면서 수업에 필요한 프로그램과 콘텐츠를 정리합니다.',
    mediaKey: 'trackDispatch' as HomeMediaKey,
    primaryCta: {
      label: '운영 사례 보기',
      href: SPOKEDU_PATHS.records,
      trackLabel: 'cta-home-why-records',
    },
  },

  spomove: {
    id: 'spomove',
    label: 'SPOMOVE',
    title: '보고, 판단하고, 움직입니다.',
    body: '화면의 정보를 확인하고 판단한 뒤 실제 움직임으로 반응하는 SPOKEDU의 자체 신체활동 콘텐츠입니다.',
    flow: ['화면 확인', '규칙 판단', '움직임'] as const,
    mediaKey: 'spomoveHeroField' as HomeMediaKey,
    primaryCta: {
      label: 'SPOMOVE 자세히 보기',
      href: SPOKEDU_PATHS.spomove,
      trackLabel: 'cta-home-spomove-learn',
    },
  },

  subscription: {
    id: 'subscription',
    title: '오늘 수업을 찾고, 준비하고, 바로 운영하세요.',
    lead: '놀이체육 콘텐츠와 SPOMOVE를 선택하고 수업 준비부터 진행·기록까지 이어서 사용할 수 있습니다.',
    flow: ['찾기', '준비', '진행', '기록'] as const,
    visual: {
      src: '/images/spokedu/subscription/product-lesson.png',
      alt: '스포키듀 구독시스템의 수업자료 상세 및 진행 화면',
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
    lead: 'SPOKEDU가 직접 운영한 수업과 프로그램 기록입니다.',
    recordsCta: {
      label: '운영 사례 전체 보기',
      href: SPOKEDU_PATHS.records,
      trackLabel: 'cta-home-cases-records',
    },
    cards: [
      buildHomeCaseCard('maedong-sports-stepup'),
      buildHomeCaseCard('donghaeng-special-pe'),
      buildHomeCaseCard('dongjak-spomove'),
    ],
  },

  finalCta: {
    id: 'final-action',
    title: '필요한 방식으로 시작하세요.',
    lead: 'SPOKEDU에 수업을 맡기거나, 구독시스템으로 직접 운영할 수 있습니다.',
    primaryCta: {
      label: '체육교육 알아보기',
      href: SPOKEDU_PATHS.education,
      trackLabel: 'cta-home-final-education',
    },
    secondaryCta: {
      label: '구독시스템 알아보기',
      href: SPOKEDU_PATHS.subscription,
      trackLabel: 'cta-home-final-subscription',
    },
    tertiaryCta: {
      label: '문의·협업',
      href: SPOKEDU_PATHS.contact,
      trackLabel: 'cta-home-final-contact',
    },
  },
} as const;
