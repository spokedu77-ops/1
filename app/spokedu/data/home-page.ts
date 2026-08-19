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

export type HomeClassItem = {
  id: 'institution' | 'private' | 'event';
  number: string;
  title: string;
  description: string;
  ctaLabel: string;
  href: string;
  trackLabel: string;
  mediaKey: HomeMediaKey;
};

export const HOME_FEATURED_CASE_SLUG: FieldRecordSlug = 'dongjak-spomove';
export const HOME_MAIN_CASE_SLUGS: readonly FieldRecordSlug[] = [HOME_FEATURED_CASE_SLUG] as const;

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

const featuredCase = buildHomeCaseCard(HOME_FEATURED_CASE_SLUG);

export const homePage = {
  sectionOrder: ['hero', 'class', 'bridge', 'spomove', 'subscription', 'cases', 'final-action'] as const,

  hero: {
    id: 'hero',
    lines: ['아동·청소년 체육수업을', '직접 설계하고 운영합니다.'] as const,
    support:
      '학교·기관부터 개인·소그룹까지 현장에 맞는 체육수업을 직접 운영하고, 그 경험을 콘텐츠와 시스템으로 확장합니다.',
    mediaKey: 'homeHero' as HomeMediaKey,
    brand: 'SPOKEDU',
    primaryCta: {
      label: '체육교육 알아보기',
      href: SPOKEDU_PATHS.education,
      trackLabel: 'cta-home-education-hero',
    },
    secondaryCta: {
      label: '운영 사례 보기',
      href: SPOKEDU_PATHS.records,
      trackLabel: 'cta-home-hero-records',
    },
  },

  class: {
    id: 'class',
    title: '먼저, 현장에서 직접 수업합니다.',
    lead: '대상과 공간, 인원과 목적이 다른 만큼 현장 조건에 맞춰 수업을 구성하고 운영합니다.',
    items: [
      {
        id: 'institution',
        number: '01',
        title: '기관·학교 체육수업',
        description: '학교·센터·복지기관의 정규수업과 늘봄, 기관 파견 수업을 운영합니다.',
        ctaLabel: '기관수업 알아보기',
        href: SPOKEDU_PATHS.dispatch,
        trackLabel: 'cta-home-class-dispatch',
        mediaKey: 'trackDispatch',
      },
      {
        id: 'private',
        number: '02',
        title: '개인·소그룹 체육수업',
        description: '아이의 연령과 운동 경험, 현재 수준과 수업 목표를 확인해 1:1 또는 소그룹으로 진행합니다.',
        ctaLabel: '개인수업 알아보기',
        href: SPOKEDU_PATHS.private,
        trackLabel: 'cta-home-class-private',
        mediaKey: 'trackPrivate',
      },
      {
        id: 'event',
        number: '03',
        title: '원데이·특수·행사',
        description: '기관 특강과 원데이, 체육행사, 특수·포용 체육을 목적과 조건에 맞춰 운영합니다.',
        ctaLabel: '프로그램 알아보기',
        href: SPOKEDU_PATHS.education,
        trackLabel: 'cta-home-class-event',
        mediaKey: 'proofEvent',
      },
    ] as const satisfies readonly HomeClassItem[],
  },

  bridge: {
    id: 'bridge',
    title: '수업하면서 필요한 것을 직접 만듭니다.',
    steps: [
      { label: 'FIELD', body: '현장 운영' },
      { label: 'CONTENT', body: '콘텐츠 제작' },
      { label: 'SYSTEM', body: '지도자 활용' },
    ] as const,
  },

  spomove: {
    id: 'spomove',
    title: '보고 판단하고 움직이는',
    titleLine2: 'SPOMOVE',
    lead: 'SPOMOVE는 스포키듀가 실제 체육수업에서 만든 화면-움직임 연결 콘텐츠입니다.',
    relationLine: '체육수업에서 운영하고, 구독시스템을 통해 지도자도 활용할 수 있습니다.',
    mediaKey: 'spomoveHeroField' as HomeMediaKey,
    primaryCta: {
      label: 'SPOMOVE 자세히 보기',
      href: SPOKEDU_PATHS.spomove,
      trackLabel: 'cta-home-spomove-learn',
    },
  },

  subscription: {
    id: 'subscription',
    title: '만든 콘텐츠를\n지도자가 다시 활용합니다.',
    lead: '수업자료를 찾고 준비하고 진행하고 기록하는 과정을 하나의 구독시스템에서 이어서 사용할 수 있습니다.',
    steps: ['찾기', '준비', '진행', '기록'] as const,
    visual: {
      src: '/images/spokedu/subscription/product-lesson.png',
      alt: '스포키듀 구독시스템의 수업자료 상세 및 진행 화면',
    },
    primaryCta: {
      label: '구독시스템 알아보기',
      href: SPOKEDU_PATHS.subscription,
      trackLabel: 'cta-home-services-subscription',
    },
  },

  cases: {
    id: 'cases',
    title: '직접 운영한 현장을\n사례로 확인하세요.',
    lead: '정규수업부터 학교·늘봄, 특수체육까지 스포키듀가 직접 운영한 대표 현장 기록입니다.',
    recordsCta: {
      label: '사례 전체 보기',
      href: SPOKEDU_PATHS.records,
      trackLabel: 'cta-home-cases-records',
    },
    cards: [
      featuredCase,
      buildHomeCaseCard('maedong-sports-stepup'),
      buildHomeCaseCard('donghaeng-special-pe'),
    ],
  },

  trustStrip: {
    id: 'trust',
    eyebrow: '운영 경험',
    items: [
      { value: '현장 운영', label: '기관·개인 수업을 직접 설계·진행' },
      { value: '다유형', label: '키움·학교·보건·복지 등 기관 스펙트럼' },
      { value: '기관·개인', label: '출강 운영과 1:1·소그룹 병행' },
      { value: '다층 운영', label: '정규·특수체육·SPOMOVE' },
    ] as const,
  },

  finalCta: {
    id: 'final-action',
    title: '수업이나 도입이 필요하신가요?',
    lead: '기관·학교 체육수업부터 개인·소그룹 수업, SPOMOVE와 지도자용 구독시스템까지 필요한 방식에 맞춰 안내합니다.',
    primaryCta: {
      label: '수업·도입 상담하기',
      href: SPOKEDU_PATHS.contact,
      trackLabel: 'cta-home-final-contact',
    },
    nav: [
      { label: '체육교육', href: SPOKEDU_PATHS.education, trackLabel: 'cta-home-final-education' },
      { label: 'SPOMOVE', href: SPOKEDU_PATHS.spomove, trackLabel: 'cta-home-final-spomove' },
      { label: '구독시스템', href: SPOKEDU_PATHS.subscription, trackLabel: 'cta-home-final-subscription' },
    ] as const,
  },
} as const;
