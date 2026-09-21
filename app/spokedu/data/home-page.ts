import {
  catalogItemToHomeCard,
  getFieldRecordCatalogItem,
  type FieldRecordCatalogItem,
  type FieldRecordSlug,
} from './field-records-catalog';
import type { HomeMediaKey } from './home-media';
import { SPOKEDU_PATHS } from './site';

export const HOME_FIELD_EDITORIAL = {
  hero: '/images/spokedu/home/field-editorial/home-hero-gym-motion.jpg',
  field: '/images/spokedu/home/field-editorial/home-hero-field.webp',
  masterUi: '/images/spokedu/home/field-editorial/home-master-ui.png',
  spomove: '/images/spokedu/home/field-editorial/home-spomove-field.webp',
  spomoveDive: '/images/spokedu/home/field-editorial/home-spomove-dive-field.webp',
  caseGeneral: '/images/spokedu/home/field-editorial/home-case-general.webp',
  caseAdapted: '/images/spokedu/home/field-editorial/home-case-adapted-p05.webp',
  caseSpomove: '/images/spokedu/home/field-editorial/home-case-spomove-p05.webp',
} as const;

const HOME_STORY_REGION: Partial<Record<FieldRecordSlug, string>> = {
  'maedong-sports-stepup': '종로',
  'donghaeng-special-pe': '서울 중구',
  'dongjak-spomove': '동작',
  'dasarang-oneday': '영등포',
  'yangcheon-paps': '양천',
  'seodaemun-event-booth': '서대문',
};

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
  categories: readonly ('institution' | 'private' | 'event' | 'spomove')[];
};

export const HOME_MAIN_CASE_SLUGS: readonly FieldRecordSlug[] = [
  'maedong-sports-stepup',
  'donghaeng-special-pe',
  'dongjak-spomove',
] as const;

function homeCaseHeadline(item: FieldRecordCatalogItem, _featured: boolean): string {
  return item.venue;
}

function homeCaseDisplayMeta(item: FieldRecordCatalogItem, _featured: boolean): string {
  const region = HOME_STORY_REGION[item.slug];
  return region ? `${item.programLabel} · ${region}` : item.programLabel;
}

function homeCaseOperation(item: FieldRecordCatalogItem, featured: boolean): string {
  const description = item.description.trim();
  if (featured) return description;
  const primary = description.split(' — ')[0]?.trim() || description;
  if (/[다요][.!?]?$/.test(primary)) return primary;
  return `${primary}입니다.`;
}

function buildHomeCaseCard(
  slug: FieldRecordSlug,
  editorial: { src: string; objectPosition?: string },
  featured = false,
): HomeCaseCard {
  const item = getFieldRecordCatalogItem(slug);
  const card = catalogItemToHomeCard(item);
  return {
    slug: card.slug,
    venue: item.venue,
    kind: item.operationType,
    headline: homeCaseHeadline(item, featured),
    operation: homeCaseOperation(item, featured),
    audience: item.onsite?.audience ?? item.meta,
    lessonType: item.programLabel,
    displayMeta: homeCaseDisplayMeta(item, featured),
    href: card.href,
    trackLabel: card.trackLabel,
    mediaKey: card.mediaKey,
    editorialSrc: editorial.src,
    editorialObjectPosition: editorial.objectPosition,
    blogImageIndex: card.blogImageIndex,
    thumbnailSrc: card.thumbnailSrc,
    categories: [
      'institution',
      ...(item.operationType === '원데이·행사' ? ['event' as const] : []),
      ...(item.programLabel === 'SPOMOVE' ? ['spomove' as const] : []),
    ],
  };
}

export const homePage = {
  sectionOrder: ['hero', 'choice', 'cases', 'spomove', 'subscription', 'contact'] as const,

  hero: {
    id: 'hero',
    eyebrow: '아동 · 청소년 · 특수 체육교육',
    lines: ['MOVEMENT BECOMES', 'LEARNING.'] as const,
    support: '학교와 기관에서 직접 수업하고 현장에서 필요한 프로그램과 시스템을 만듭니다.',
    mediaKey: 'homeHeroGymMotion' as HomeMediaKey,
    primaryCta: {
      label: '수업 알아보기',
      href: '#choice',
      trackLabel: 'cta-home-education-hero',
    },
    secondaryCta: {
      label: '수업자료 둘러보기',
      href: SPOKEDU_PATHS.subscription,
      trackLabel: 'cta-home-subscription-hero',
    },
  },

  choice: {
    id: 'choice',
    title: '무엇을 찾고 계신가요?',
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
      stageTitle: '기관·학교 체육수업',
      description: '학교와 기관의 환경과 대상에 맞춰 수업을 설계하고 운영합니다.',
      href: SPOKEDU_PATHS.education,
      trackLabel: 'cta-home-choice-education',
      action: '수업 보기',
    },
    {
      audience: '아이·학부모',
      label: '개인·소그룹 수업',
      stageTitle: '개인·소그룹 수업',
      description: '아이의 움직임과 참여 수준에 맞춰 수업을 진행합니다.',
      href: SPOKEDU_PATHS.private,
      trackLabel: 'cta-home-choice-private',
      action: '자세히 보기',
    },
    {
      audience: '체육 지도자',
      label: '수업자료·구독',
      stageTitle: '스포키듀 구독시스템',
      description: '수업자료부터 SPOMOVE까지 실제 수업 준비에 사용하는 콘텐츠를 한 곳에서.',
      href: SPOKEDU_PATHS.subscription,
      trackLabel: 'cta-home-choice-subscription',
      action: 'MASTER 둘러보기',
    },
  ],

  spomove: {
    id: 'spomove',
    label: 'SPOMOVE',
    titleLines: ['화면의 신호가', '몸의 움직임으로 이어집니다.'] as const,
    title: '화면의 신호가 몸의 움직임으로 이어집니다.',
    definition:
      '화면의 색과 길을 보고 바닥에서 움직여 반응하는 콘텐츠입니다. 기관 수업에서 활용하고, 지도자는 구독서비스에서 이용할 수 있습니다.',
    exampleNote: '아래 화면과 현장 사진은 같은 DIVE 수업입니다.',
    screen: {
      src: HOME_FIELD_EDITORIAL.spomoveDive,
      alt: '같은 DIVE 수업의 실행 화면 — 노란 길과 파란 게이트가 제시된 장면',
      objectPosition: '50% 30%',
    },
    mediaKey: 'homeSpomoveDiveField' as HomeMediaKey,
    primaryCta: {
      label: 'SPOMOVE 수업 방식 보기',
      href: SPOKEDU_PATHS.spomove,
      trackLabel: 'cta-home-spomove-learn',
    },
  },

  subscription: {
    id: 'subscription',
    titleLines: ['다음 수업을 준비하는 데', '필요한 자료를 한곳에.'] as const,
    lead: '놀이체육 자료와 SPOMOVE를 찾아 수업 준비와 진행으로 이어갈 수 있습니다.',
    flow: ['찾기', '준비', '진행', '기록'] as const,
    features: [
      {
        id: 'find',
        title: '대상에 맞는 수업 찾기',
        body: '대상·공간 조건으로 수업을 고르면 수업명과 활동 장면이 카드로 보입니다.',
      },
      {
        id: 'prepare',
        title: '준비물과 진행 방법 확인',
        body: '수업 카드의 수업 준비로 들어가면 준비물과 진행 방법을 확인할 수 있습니다.',
      },
    ] as const,
    visual: {
      src: HOME_FIELD_EDITORIAL.masterUi,
      alt: 'SPOKEDU MASTER 실제 화면 — 놀이체육 추천과 SPOMOVE 추천',
      caption: '실제 서비스 화면',
      explorerCrop: '50% 14%',
      libraryCrop: '50% 40%',
      productCrop: '50% 74%',
    },
    primaryCta: {
      label: '수업자료·구독 안내',
      href: SPOKEDU_PATHS.subscription,
      trackLabel: 'cta-home-subscription-learn',
    },
  },

  cases: {
    id: 'cases',
    title: '수업은 현장에서 증명됩니다.',
    lead: '실제 운영한 수업을 넘겨보며 현장을 확인하세요.',
    recordsCta: {
      label: 'ALL RECORDS',
      href: SPOKEDU_PATHS.records,
      trackLabel: 'cta-home-cases-records',
    },
    cards: [
      buildHomeCaseCard(
        'maedong-sports-stepup',
        {
          src: HOME_FIELD_EDITORIAL.caseGeneral,
          objectPosition: '36% 58%',
        },
        true,
      ),
      buildHomeCaseCard('donghaeng-special-pe', {
        src: HOME_FIELD_EDITORIAL.caseAdapted,
        objectPosition: '48% 42%',
      }),
      buildHomeCaseCard('dongjak-spomove', {
        src: HOME_FIELD_EDITORIAL.caseSpomove,
        objectPosition: '48% 46%',
      }),
      buildHomeCaseCard('dasarang-oneday', {
        src: '/images/spokedu/records/dasarang-oneday-field.jpg',
        objectPosition: '50% 52%',
      }),
      buildHomeCaseCard('yangcheon-paps', {
        src: '/images/spokedu/records/yangcheon-paps.jpg',
        objectPosition: '50% 42%',
      }),
      buildHomeCaseCard('seodaemun-event-booth', {
        src: '/images/spokedu/records/seodaemun-event-booth.jpg',
        objectPosition: '48% 40%',
      }),
    ],
  },

  contact: {
    id: 'contact',
    title: '어디에서 시작하시겠어요?',
    lead: '기관·학교, 개인·소그룹, 지도자 경로 중 하나를 고르면 됩니다.',
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
