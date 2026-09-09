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
  caseAdapted: '/images/spokedu/home/field-editorial/home-case-adapted-p05.webp',
  caseSpomove: '/images/spokedu/home/field-editorial/home-case-spomove-p05.webp',
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
  sectionOrder: ['hero', 'choice', 'cases', 'spomove', 'subscription', 'contact'] as const,

  hero: {
    id: 'hero',
    lines: ['움직임으로 배우고,', '경험으로 자랍니다.'] as const,
    support:
      '아동·청소년을 위한 체육수업을 직접 설계하고 운영합니다. 현장에서 사용하는 수업자료와 SPOMOVE 콘텐츠도 만듭니다.',
    mediaKey: 'homeHeroField' as HomeMediaKey,
    brand: 'SPOKEDU',
    primaryCta: {
      label: '나에게 맞는 수업 찾기',
      href: '#choice',
      trackLabel: 'cta-home-education-hero',
    },
    secondaryCta: {
      label: '수업자료·구독 알아보기',
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
        label: '수업자료·구독 알아보기',
        href: SPOKEDU_PATHS.subscription,
        trackLabel: 'cta-home-choice-subscription',
      },
    },
  },

  serviceChoices: [
    { label: '기관·학교 수업', audience: '학교·센터·복지관', description: '정기수업부터 특강·행사까지, 기관의 대상과 공간에 맞춰 운영합니다.', href: SPOKEDU_PATHS.education, trackLabel: 'cta-home-choice-education', action: '기관수업 알아보기' },
    { label: '개인·소그룹 수업', audience: '아이·학부모', description: '아이의 운동 경험과 수업 목표를 확인하고, 함께할 수업 방식을 안내합니다.', href: SPOKEDU_PATHS.private, trackLabel: 'cta-home-choice-private', action: '개인수업 알아보기' },
    { label: '수업자료·구독', audience: '체육 지도자', description: '놀이체육 자료와 SPOMOVE로 수업을 찾고, 준비하고, 진행하세요.', href: SPOKEDU_PATHS.subscription, trackLabel: 'cta-home-choice-subscription', action: '구독 알아보기' },
  ],

  spomove: {
    id: 'spomove',
    label: 'SPOMOVE',
    title: '화면을 보고, 판단하고,\n움직입니다.',
    definition:
      '화면의 정보를 확인하고 규칙에 따라 판단한 뒤, 움직임으로 반응하는 SPOKEDU의 자체 신체활동 콘텐츠입니다.',
    flow: [
      {
        title: '화면 확인',
        description: '화면에 제시된 정보와 규칙을 확인합니다.',
      },
      {
        title: '규칙 판단',
        description: '주어진 규칙에 따라 반응을 판단합니다.',
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
      src: '/images/spokedu/subscription/product-home-stage-p05.webp',
      alt: '구독시스템 수업 라이브러리에서 수업을 고르고, 선택한 수업의 준비·기록 화면',
    },
    primaryCta: {
      label: '수업자료·구독 알아보기',
      href: SPOKEDU_PATHS.subscription,
      trackLabel: 'cta-home-subscription-learn',
    },
  },

  cases: {
    id: 'cases',
    title: '우리 수업은 현장에서 이어집니다.',
    lead: '학교의 정기수업부터 포용 체육까지, 실제 운영한 수업을 만나보세요.',
    recordsCta: {
      label: '수업 사례 전체 보기',
      href: SPOKEDU_PATHS.records,
      trackLabel: 'cta-home-cases-records',
    },
    cards: [
      buildHomeCaseCard('maedong-sports-stepup', {
        src: HOME_FIELD_EDITORIAL.caseGeneral,
        objectPosition: '36% 58%',
      }),
      buildHomeCaseCard('donghaeng-special-pe', {
        src: HOME_FIELD_EDITORIAL.caseAdapted,
        objectPosition: '48% 42%',
      }),
      buildHomeCaseCard('dongjak-spomove', {
        src: HOME_FIELD_EDITORIAL.caseSpomove,
        objectPosition: '48% 46%',
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
