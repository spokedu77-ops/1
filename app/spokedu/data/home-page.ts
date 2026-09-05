import {
  catalogItemToHomeCard,
  getFieldRecordCatalogItem,
  type FieldRecordSlug,
} from './field-records-catalog';
import type { HomeMediaKey } from './home-media';
import { SPOKEDU_PATHS } from './site';

export const HOME_FIELD_EDITORIAL = {
  hero: '/images/spokedu/home/field-editorial/home-hero-field.webp',
  spomove: '/images/spokedu/home/field-editorial/home-spomove-field.webp',
  caseGeneral: '/images/spokedu/home/field-editorial/home-case-general.webp',
  caseAdapted: '/images/spokedu/home/field-editorial/home-case-adapted.webp',
  caseSpomove: '/images/spokedu/home/field-editorial/home-case-spomove.webp',
} as const;

export type HomeCaseCard = {
  slug: string;
  venue: string;
  displayMeta: string;
  href: string;
  trackLabel: string;
  mediaKey: HomeMediaKey;
  editorialSrc: string;
  editorialObjectPosition?: string;
  blogImageIndex?: number;
  thumbnailSrc?: string;
};

export const HOME_MAIN_CASE_SLUGS: readonly FieldRecordSlug[] = [
  'maedong-sports-stepup',
  'donghaeng-special-pe',
  'dongjak-spomove',
] as const;

const HOME_CASE_DISPLAY_META: Partial<Record<FieldRecordSlug, string>> = {
  'maedong-sports-stepup': '6개월 늘봄 스포츠 · 기관 정기운영',
  'donghaeng-special-pe': '특수·포용 체육 · 찾아가는 동행체육',
  'dongjak-spomove': '초등학생 · SPOMOVE',
};

function buildHomeCaseCard(
  slug: FieldRecordSlug,
  editorial: { src: string; objectPosition?: string },
): HomeCaseCard {
  const item = getFieldRecordCatalogItem(slug);
  const card = catalogItemToHomeCard(item);
  return {
    slug: card.slug,
    venue: item.venue,
    displayMeta: HOME_CASE_DISPLAY_META[slug] ?? item.meta,
    href: card.href,
    trackLabel: card.trackLabel,
    mediaKey: card.mediaKey,
    editorialSrc: editorial.src,
    editorialObjectPosition: editorial.objectPosition,
    blogImageIndex: card.blogImageIndex,
    thumbnailSrc: card.thumbnailSrc,
  };
}

export const homePage = {
  sectionOrder: ['hero', 'choice', 'spomove', 'subscription', 'cases', 'contact'] as const,

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
  },

  choice: {
    id: 'choice',
    title: '수업을 맡기거나, 직접 운영하세요.',
    education: {
      headline: '체육수업',
      tagline: 'SPOKEDU가 직접 수업합니다.',
      body: '학교·기관부터 개인·소그룹까지 대상과 환경에 맞춰 수업을 구성하고 운영합니다.',
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

  spomove: {
    id: 'spomove',
    label: 'SPOMOVE',
    title: '화면을 보고, 판단하고,\n움직입니다.',
    definition:
      '화면의 정보를 확인하고 규칙에 따라 판단한 뒤,\n움직임으로 반응하는 SPOKEDU의 자체 신체활동 콘텐츠입니다.',
    flow: [
      {
        title: '화면 확인',
        description: '화면에 제시된 정보와 규칙을 확인합니다.',
      },
      {
        title: '규칙 판단',
        description: '주어진 규칙에 따라 어떻게 반응할지 판단합니다.',
      },
      {
        title: '움직임',
        description: '판단한 반응을 몸의 움직임으로 실행합니다.',
      },
    ] as const,
    mediaKey: 'homeSpomoveField' as HomeMediaKey,
    primaryCta: {
      label: 'SPOMOVE 자세히 보기',
      href: SPOKEDU_PATHS.spomove,
      trackLabel: 'cta-home-spomove-learn',
    },
  },

  subscription: {
    id: 'subscription',
    titleLines: ['오늘 수업을 찾고,', '준비하고,', '바로 운영하세요.'] as const,
    lead: '놀이체육 콘텐츠와 SPOMOVE를 찾고, 수업 준비부터 진행·기록까지 한곳에서 이어갈 수 있습니다.',
    flow: ['찾기', '준비', '진행', '기록'] as const,
    visual: {
      src: '/images/spokedu/subscription/product-home-stage.webp',
      alt: '스포키듀 구독시스템 수업 화면 — 준비·진행·기록',
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
    lead: '학교·기관에서 진행한\n실제 수업과 프로그램입니다.',
    recordsCta: {
      label: '운영 사례 전체 보기',
      href: SPOKEDU_PATHS.records,
      trackLabel: 'cta-home-cases-records',
    },
    cards: [
      buildHomeCaseCard('maedong-sports-stepup', {
        src: HOME_FIELD_EDITORIAL.caseGeneral,
        objectPosition: '40% 32%',
      }),
      buildHomeCaseCard('donghaeng-special-pe', {
        src: HOME_FIELD_EDITORIAL.caseAdapted,
        objectPosition: '68% 46%',
      }),
      buildHomeCaseCard('dongjak-spomove', {
        src: HOME_FIELD_EDITORIAL.caseSpomove,
        objectPosition: '52% 50%',
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
