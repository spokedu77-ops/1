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
  kind: string;
  headline: string;
  operation: string;
  audience: string;
  lessonType: string;
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

const HOME_CASE_PROOF: Partial<
  Record<FieldRecordSlug, { kind: string; headline: string; operation: string }>
> = {
  'maedong-sports-stepup': {
    kind: '학교 늘봄',
    headline: '매동초등학교 · 스포츠 스텝업',
    operation: '클라이밍·피클볼 등 종목을 차례로 경험하는 6개월 늘봄 연계 정규수업입니다.',
  },
  'donghaeng-special-pe': {
    kind: '특수체육',
    headline: '찾아가는 동행 체육교실',
    operation: '특수체육 현장에서 아이와 함께 움직이는 맞춤 활동으로 운영합니다.',
  },
  'dongjak-spomove': {
    kind: '초등 · 키움센터',
    headline: '동작거점형 우리동네키움센터 · SPOMOVE',
    operation: '스크린 신호를 보고 판단·반응하며 움직이는 거점형 키움센터 집단 수업입니다.',
  },
};

function buildHomeCaseCard(
  slug: FieldRecordSlug,
  editorial: { src: string; objectPosition?: string },
): HomeCaseCard {
  const item = getFieldRecordCatalogItem(slug);
  const card = catalogItemToHomeCard(item);
  const proof = HOME_CASE_PROOF[slug];
  return {
    slug: card.slug,
    venue: item.venue,
    kind: proof?.kind ?? item.operationType,
    headline: proof?.headline ?? `${item.venue} · ${item.programLabel}`,
    operation: proof?.operation ?? item.description,
    audience: proof?.kind ?? item.onsite?.audience ?? item.meta,
    lessonType: item.programLabel,
    displayMeta: proof?.kind ?? item.meta,
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
    lines: ['아이들이 움직이며', '배우는 체육수업을', '만듭니다.'] as const,
    support:
      '학교·기관 수업과 개인·소그룹 수업을 직접 운영합니다. 지도자를 위한 수업자료와 SPOMOVE 콘텐츠도 만듭니다.',
    mediaKey: 'homeHeroMovement' as HomeMediaKey,
    brand: 'SPOKEDU',
    primaryCta: {
      label: '수업 유형 살펴보기',
      href: '#choice',
      trackLabel: 'cta-home-education-hero',
    },
    secondaryCta: {
      label: '지도자용 자료 살펴보기',
      href: SPOKEDU_PATHS.subscription,
      trackLabel: 'cta-home-subscription-hero',
    },
  },

  choice: {
    id: 'choice',
    title: '수업을 맡기거나, 직접 준비하세요.',
    education: {
      headline: '체육수업',
      tagline: 'SPOKEDU가 직접 수업합니다.',
      body: '학교·기관부터 개인·소그룹까지 대상과 환경에 맞춰 수업을 구성하고 운영합니다.',
      primaryCta: {
        label: '기관 수업 안내',
        href: SPOKEDU_PATHS.education,
        trackLabel: 'cta-home-choice-education',
      },
    },
    subscription: {
      headline: '수업자료·구독',
      tagline: '지도자가 직접 수업할 수 있도록 돕습니다.',
      body: '놀이체육 자료와 SPOMOVE로 수업을 찾고 준비합니다.',
      primaryCta: {
        label: '수업자료·구독 안내',
        href: SPOKEDU_PATHS.subscription,
        trackLabel: 'cta-home-choice-subscription',
      },
    },
  },

  serviceChoices: [
    {
      audience: '학교·기관 담당자',
      label: '기관·학교 수업',
      description: '정기수업부터 특강·행사까지, 기관의 대상과 공간에 맞춰 운영합니다.',
      href: SPOKEDU_PATHS.education,
      trackLabel: 'cta-home-choice-education',
      action: '기관 수업 안내',
    },
    {
      audience: '아이·학부모',
      label: '개인·소그룹 수업',
      description: '아이의 운동 경험과 수업 목표를 확인하고, 함께할 수업 방식을 안내합니다.',
      href: SPOKEDU_PATHS.private,
      trackLabel: 'cta-home-choice-private',
      action: '개인 수업 안내',
    },
    {
      audience: '체육 지도자',
      label: '수업자료·구독',
      description: '놀이체육 자료와 SPOMOVE로 수업을 찾고 준비합니다.',
      href: SPOKEDU_PATHS.subscription,
      trackLabel: 'cta-home-choice-subscription',
      action: '수업자료·구독 안내',
    },
  ],

  spomove: {
    id: 'spomove',
    kicker: '현장에서 사용하는 수업 콘텐츠도 만듭니다.',
    label: 'SPOMOVE',
    title: '화면 속 규칙이 몸의 움직임으로 이어집니다.',
    definition:
      'SPOMOVE는 화면의 정보를 확인하고 규칙에 따라 움직임으로 반응하는 SPOKEDU의 자체 신체활동 콘텐츠입니다. 기관 수업에서 활용하고, 지도자는 구독서비스에서 이용할 수 있습니다.',
    mediaKey: 'homeSpomoveDiveField' as HomeMediaKey,
    primaryCta: {
      label: 'SPOMOVE 수업 방식 보기',
      href: SPOKEDU_PATHS.spomove,
      trackLabel: 'cta-home-spomove-learn',
    },
  },

  subscription: {
    id: 'subscription',
    titleLines: ['수업을 고르고,', '준비하고,', '진행하세요.'] as const,
    lead: '놀이체육 자료와 SPOMOVE를 찾아 수업 준비와 진행으로 이어갈 수 있습니다.',
    flow: ['찾기', '준비', '진행', '기록'] as const,
    features: [
      {
        id: 'find',
        title: '대상에 맞는 수업 찾기',
        body: '대상·공간 조건으로 수업을 고르면 수업명과 활동 장면이 카드로 보입니다.',
        src: '/images/spokedu/subscription/library-program-cards.png',
        alt: '조건 필터와 육상 스테핑 드릴, 접시콘 빙고 등 수업 카드가 보이는 라이브러리 화면',
        caption: '실제 서비스 화면',
        fit: 'cover',
      },
      {
        id: 'prepare',
        title: '준비물과 진행 방법 확인',
        body: '준비물 수량과 진행 순서를 수업 화면에서 확인합니다.',
        src: '/images/spokedu/subscription/prepare-dishcone-bingo.png',
        alt: '접시콘 빙고 수업의 준비물과 진행 방법이 보이는 실제 서비스 화면',
        caption: '실제 서비스 화면',
        fit: 'contain',
      },
    ] as const,
    visual: {
      src: '/images/spokedu/subscription/library-program-cards.png',
      alt: '조건 필터와 수업명·활동 썸네일이 보이는 라이브러리 화면',
      caption: '실제 서비스 화면',
    },
    primaryCta: {
      label: '수업자료·구독 안내',
      href: SPOKEDU_PATHS.subscription,
      trackLabel: 'cta-home-subscription-learn',
    },
  },

  cases: {
    id: 'cases',
    title: '이런 현장에서 수업하고 있습니다.',
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
    title: '수업 상담을 남겨 주세요.',
    lead: '기관·학교 수업과 개인·소그룹 수업은 상담 유형을 나눠 안내합니다. 지도자용 자료가 필요하면 공개 소개 페이지를 먼저 볼 수 있습니다.',
    primaryCta: {
      label: '기관 수업 상담',
      href: `${SPOKEDU_PATHS.contact}?type=dispatch`,
      trackLabel: 'cta-home-contact-dispatch',
    },
    secondaryCta: {
      label: '개인 수업 상담',
      href: `${SPOKEDU_PATHS.contact}?type=private`,
      trackLabel: 'cta-home-contact-private',
    },
    supportCta: {
      label: '수업자료·구독 안내',
      href: SPOKEDU_PATHS.subscription,
      trackLabel: 'cta-home-contact-subscription',
    },
  },
} as const;
