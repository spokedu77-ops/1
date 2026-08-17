import {
  catalogItemToHomeCard,
  getFieldRecordCatalogItem,
  type FieldRecordSlug,
} from './field-records-catalog';
import type { HomeMediaKey } from './home-media';
import { SPOKEDU_BASE_PATH, SPOKEDU_PATHS } from './site';

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

export type HomeAudienceGateItem = {
  id: string;
  badge: string;
  title: string;
  description: string;
  fit: string;
  bullets: readonly string[];
  ctaLabel: string;
  href: string;
  trackLabel: string;
  mediaKey: HomeMediaKey;
};

export type HomeSpomoveFlowStep = {
  label: string;
  hint: string;
};

export type HomeSpomoveProof = {
  value: string;
  label: string;
};

export type HomeSpomoveUseCase = {
  title: string;
  body: string;
};

export type HomeHeroQuickLink = {
  label: string;
  href: string;
  trackLabel: string;
};

export type HomeTrustStat = {
  value: string;
  label: string;
};

export type HomePillarItem = {
  id: 'education' | 'spomove' | 'curriculum';
  badge: string;
  title: string;
  role: string;
  examples: readonly string[];
  ctaLabel: string;
  href: string;
  trackLabel: string;
  /** SPOMOVE 등 관계 표기 */
  relationNote?: string;
  visual: {
    src: string;
    alt: string;
    fit?: 'cover' | 'contain';
  };
};

export type HomeCycleStep = {
  label: string;
  body: string;
};

/** 홈 SPOMOVE 사례 증거 — 공개·이미지·과정 중심 설명 가능한 1건 */
export const HOME_FEATURED_CASE_SLUG: FieldRecordSlug = 'dongjak-spomove';

/** @deprecated 홈 사례 레일 시절 슬러그 — 호환·테스트 참조용 */
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

/**
 * About 페이지가 참조하는 신뢰 스트립 — 홈 조립에서는 사용하지 않음.
 * 홈 증거는 `evidenceStrip`을 쓴다.
 */
function buildAboutTrustStripItems(): readonly HomeTrustStat[] {
  return [
    { value: '현장 운영', label: '기관·개인 수업을 직접 설계·진행' },
    { value: '다유형', label: '키움·학교·보건·복지 등 기관 스펙트럼' },
    { value: '기관·개인', label: '출강 운영과 1:1·소그룹 병행' },
    { value: '다층 운영', label: '정규·특수체육·SPOMOVE' },
  ];
}

export const homePage = {
  /** 홈 최상위 섹션 조립 순서 — 7개 이하 */
  sectionOrder: ['hero', 'pillars', 'paths', 'spomove', 'subscription', 'fieldProof', 'finalAction'] as const,

  hero: {
    id: 'hero',
    lines: ['아동·청소년 체육교육을 직접 운영하고', '콘텐츠와 시스템으로 이어갑니다.'] as const,
    support:
      '학교·기관·개인 수업에서 검증한 방식으로 SPOMOVE를 만들고, 지도자가 직접 활용하는 구독시스템까지 제공합니다.',
    mediaKey: 'homeHero' as HomeMediaKey,
    brand: 'SPOKEDU',
    youtubeVideoId: 'vv4f7Y9ea0k',
    youtubeTitle: '현장 영상 보기',
    youtubeTrackLabel: 'cta-home-hero-youtube',
    primaryCta: {
      label: '체육교육 알아보기',
      href: `${SPOKEDU_BASE_PATH}/education`,
      trackLabel: 'cta-home-education-hero',
    },
    secondaryCta: {
      label: 'SPOMOVE 알아보기',
      href: `${SPOKEDU_PATHS.spomove}`,
      trackLabel: 'cta-home-spomove-hero',
    },
    recordsLink: {
      label: '운영 사례 보기',
      href: `${SPOKEDU_BASE_PATH}/records`,
      trackLabel: 'cta-home-hero-records',
    },
    /** @deprecated 히어로 퀵링크 — PR2에서 섹션2로 이관 */
    quickLinks: [
      {
        label: '기관 담당자',
        href: `${SPOKEDU_BASE_PATH}/dispatch`,
        trackLabel: 'cta-home-hero-quick-dispatch',
      },
      {
        label: '학부모',
        href: `${SPOKEDU_BASE_PATH}/private`,
        trackLabel: 'cta-home-hero-quick-private',
      },
      {
        label: '지도자·파트너',
        href: `${SPOKEDU_PATHS.subscription}`,
        trackLabel: 'cta-home-hero-quick-curriculum',
      },
    ] as const satisfies readonly HomeHeroQuickLink[],
    mediaCaption: {
      label: '대표 현장',
      title: '기관·아동과 함께하는 체육수업 현장',
    },
  },

  services: {
    education: {
      title: '체육교육',
      summary: 'SPOKEDU가 직접 운영하는 현장 체육교육입니다.',
      ctaLabel: '체육교육 알아보기',
      href: `${SPOKEDU_BASE_PATH}/education`,
      trackLabel: 'cta-home-services-education',
      directLinks: [
        { label: '기관 수업', href: `${SPOKEDU_BASE_PATH}/dispatch`, trackLabel: 'cta-home-services-dispatch' },
        { label: '개인·소그룹', href: `${SPOKEDU_BASE_PATH}/private`, trackLabel: 'cta-home-services-private' },
      ],
    },
    subscription: {
      title: '구독시스템',
      summary: '지도자가 직접 수업을 운영할 수 있도록 만든 콘텐츠 시스템입니다.',
      ctaLabel: '구독시스템 알아보기',
      href: `${SPOKEDU_PATHS.subscription}`,
      trackLabel: 'cta-home-services-subscription',
    },
  },

  whySpokedu: {
    title: '직접 수업하며 필요한 것을 만듭니다.',
    body: 'SPOKEDU는 실제 체육수업에서 움직임을 관찰하고, 수업에 필요한 콘텐츠와 시스템을 직접 만듭니다.',
    cta: { label: '운영 사례 보기', href: `${SPOKEDU_BASE_PATH}/records`, trackLabel: 'cta-home-why-records' },
  },

  education: {
    id: 'education',
    eyebrow: 'PHYSICAL EDUCATION',
    title: '아이와 현장에 맞춰\n직접 설계하고 운영합니다.',
    lead: '학교와 기관의 운영 조건부터 개인·소그룹의 발달 속도까지 살펴 수업의 구성과 난이도를 조절합니다.',
    mediaKey: 'trackDispatch' as HomeMediaKey,
    points: ['기관·학교 정규수업', '개인·소그룹 수업', '원데이·행사', '특수·포용 체육'] as const,
    primaryCta: {
      label: '체육교육 알아보기',
      href: SPOKEDU_PATHS.education,
      trackLabel: 'cta-home-education-section',
    },
    secondaryCta: {
      label: '기관수업 보기',
      href: SPOKEDU_PATHS.dispatch,
      trackLabel: 'cta-home-education-dispatch',
    },
  },

  audienceGate: {
    id: 'paths',
    title: '무엇을 찾고 계신가요?',
    lead: '방문 목적에 맞는 경로를 고르면, 해당 안내로 바로 이어집니다.',
    items: [
      {
        id: 'dispatch',
        badge: '기관 담당자',
        title: '기관수업',
        description: '학교·센터·복지관·공공기관의 정규수업, 원데이, 방학 프로그램.',
        fit: '외부 수업 운영을 기관 조건에 맞춰 구성할 때',
        bullets: ['정규수업', '원데이·행사', '방학 프로그램'] as const,
        ctaLabel: '기관수업 알아보기',
        href: `${SPOKEDU_BASE_PATH}/dispatch`,
        trackLabel: 'cta-home-gate-dispatch',
        mediaKey: 'trackDispatch',
      },
      {
        id: 'private',
        badge: '학부모',
        title: '개인·소그룹',
        description: '아이의 연령과 현재 수준에 맞춘 개인·소그룹 체육수업.',
        fit: '아이 속도에 맞춰 움직임을 시작하고 싶을 때',
        bullets: ['1:1', '소그룹', '기초 움직임'] as const,
        ctaLabel: '개인·소그룹 알아보기',
        href: `${SPOKEDU_BASE_PATH}/private`,
        trackLabel: 'cta-home-gate-private',
        mediaKey: 'trackSmallGroup',
      },
      {
        id: 'curriculum',
        badge: '지도자·센터 운영자',
        title: '구독시스템',
        description: '놀이체육 콘텐츠, SPOMOVE, 수업 준비와 기록을 연결하는 구독시스템.',
        fit: '수업을 고르고 준비하고 진행·기록할 도구가 필요할 때',
        bullets: ['콘텐츠', 'SPOMOVE', '준비·진행·기록'] as const,
        ctaLabel: '구독시스템 알아보기',
        href: `${SPOKEDU_PATHS.subscription}`,
        trackLabel: 'cta-home-gate-curriculum',
        mediaKey: 'gateCurriculum',
      },
      {
        id: 'partner',
        badge: '파트너·협업',
        title: '문의·협업',
        description: '지도자 교육, 커리큘럼, 기관 도입, 콘텐츠·장비 협업.',
        fit: '교육·도입·협업 범위를 함께 정하고 싶을 때',
        bullets: ['지도자 교육', '기관 도입', '콘텐츠 협업'] as const,
        ctaLabel: '문의·협업',
        href: `${SPOKEDU_BASE_PATH}/contact`,
        trackLabel: 'cta-home-gate-partner',
        mediaKey: 'proofCommunity',
      },
    ] satisfies HomeAudienceGateItem[],
  },

  pillars: {
    id: 'pillars',
    eyebrow: '탐색 진입점',
    title: '직접 운영한 체육교육에서\n콘텐츠와 시스템이 이어집니다.',
    lead: '체육교육은 SPOKEDU가 직접 운영하는 서비스이고, SPOMOVE는 그 현장에서 만든 콘텐츠입니다. 구독시스템은 지도자가 이 콘텐츠와 운영 도구를 직접 쓰는 제품입니다.',
    relationLine: '현장에서 수업하고, 필요한 콘텐츠를 만들고, 지도자가 다시 활용할 수 있게 연결합니다.',
    items: [
      {
        id: 'education',
        badge: '직접 운영',
        title: '체육교육',
        role: '스포키듀가 직접 운영하는 아동·청소년 체육교육',
        examples: ['기관수업', '개인·소그룹', '원데이·행사', '특수·포용 체육'] as const,
        ctaLabel: '체육교육 보기',
        href: `${SPOKEDU_BASE_PATH}/education`,
        trackLabel: 'cta-home-pillar-education',
        visual: {
          src: '/images/spokedu/dispatch/dispatch-institution-class.jpg',
          alt: '기관에서 진행 중인 스포키듀 체육교육 현장',
          fit: 'cover',
        },
      },
      {
        id: 'spomove',
        badge: '공통 콘텐츠',
        title: 'SPOMOVE',
        role: '화면의 시각 정보를 실제 움직임으로 연결하는 스포키듀 콘텐츠',
        examples: ['수업에서 사용', '구독으로 이용', 'SPOMAT으로 실행'] as const,
        ctaLabel: 'SPOMOVE 보기',
        href: `${SPOKEDU_PATHS.spomove}`,
        trackLabel: 'cta-home-pillar-spomove',
        relationNote: '체육교육·구독 공통 콘텐츠',
        visual: {
          src: '/images/spokedu/home/home-hero-spomove-class.JPG',
          alt: '화면 신호를 보며 움직이는 SPOMOVE 수업 현장',
          fit: 'cover',
        },
      },
      {
        id: 'curriculum',
        badge: '지도자 제품',
        title: '구독시스템',
        role: '지도자가 수업을 고르고 준비하고 진행하고 기록하도록 돕는 제품',
        examples: ['콘텐츠 선택', '수업 준비', '진행·기록'] as const,
        ctaLabel: '구독시스템 보기',
        href: `${SPOKEDU_PATHS.subscription}`,
        trackLabel: 'cta-home-pillar-curriculum',
        visual: {
          src: '/images/spokedu/subscription/product-library.png',
          alt: '스포키듀 구독시스템의 실제 수업 라이브러리 화면',
          fit: 'contain',
        },
      },
    ] as const satisfies readonly HomePillarItem[],
  },

  /** 현장 → 콘텐츠 → 시스템 순환 */
  cycle: {
    id: 'cycle',
    title: '현장에서 시작해 시스템으로, 다시 현장으로',
    lead: '직접 운영한 수업을 정리해 프로그램과 SPOMOVE로 구성하고, 구독시스템을 통해 다시 현장에서 씁니다.',
    processLabel: 'FIELD → CONTENT → SYSTEM',
    processLine: '현장 → 콘텐츠 → 시스템 → 다시 현장' as const,
    steps: [
      {
        label: '현장',
        body: '기관·개인 수업을 직접 운영하며 조건을 확인합니다.',
      },
      {
        label: '정리',
        body: '활동과 운영 과정을 기록하고 기준을 다듬습니다.',
      },
      {
        label: '콘텐츠',
        body: '프로그램과 SPOMOVE로 구성해 재사용할 수 있게 합니다.',
      },
      {
        label: '시스템',
        body: '구독시스템으로 지도자와 기관이 현장에서 다시 활용합니다.',
      },
    ] as const satisfies readonly HomeCycleStep[],
  },

  /**
   * @deprecated 홈 UI는 `cycle` 사용.
   * 구 HomeProofStrip·테스트 호환 키.
   */
  proofStrip: {
    id: 'cycle',
    title: '현장에서 시작해 시스템으로, 다시 현장으로',
    lead: '직접 운영한 수업을 정리해 프로그램과 SPOMOVE로 구성하고, 구독시스템을 통해 다시 현장에서 씁니다.',
    items: ['현장', '정리', '콘텐츠', '시스템'] as const,
    processLabel: 'FIELD → CONTENT → SYSTEM',
    processLine: '현장 → 콘텐츠 → 시스템 → 다시 현장' as const,
  },

  spomove: {
    id: 'spomove',
    title: '보고 판단하고 움직이는',
    titleLine2: 'SPOMOVE',
    lead: 'SPOMOVE는 실제 체육수업에서 만든 화면-움직임 연결 콘텐츠입니다. SPOKEDU 수업에서 운영하고, 구독시스템을 통해 지도자도 활용합니다.',
    flowSteps: [
      { label: '확인', hint: '시각 자극' },
      { label: '판단', hint: '규칙 선택' },
      { label: '수행', hint: '신체 반응' },
      { label: '조절', hint: '속도·난이도' },
    ] as const satisfies readonly HomeSpomoveFlowStep[],
    proofs: [
      { value: '공간', label: '강당·교실·센터' },
      { value: '난이도', label: '연령·수준 맞춤' },
      { value: '운영', label: '정규·행사·통합반' },
    ] as const satisfies readonly HomeSpomoveProof[],
    useCases: [
      {
        title: '체육교육',
        body: '기관·개인 수업에서 신호 읽기와 움직임을 연결합니다.',
      },
      {
        title: '구독시스템',
        body: '지도자가 같은 콘텐츠로 준비하고 진행합니다.',
      },
      {
        title: 'SPOMAT',
        body: '제시된 규칙에 따라 패드 위에서 실행합니다.',
      },
    ] as const satisfies readonly HomeSpomoveUseCase[],
    mediaKey: 'homeHeroWide' as HomeMediaKey,
    featuredCase,
    primaryCta: {
      label: 'SPOMOVE 알아보기',
      href: `${SPOKEDU_PATHS.spomove}`,
      trackLabel: 'cta-home-spomove-learn',
    },
    secondaryCta: {
      label: '사례 더 보기',
      href: `${SPOKEDU_BASE_PATH}/records`,
      trackLabel: 'cta-home-spomove-records',
    },
  },

  /** 홈 사례 데이터 — 섹션5 증거 카드용 (레일·다건 갤러리 비사용) */
  cases: {
    id: 'cases',
    title: '실제 운영 사례',
    lead: '공개된 현장 기록 중 SPOMOVE 운영이 확인되는 대표 사례입니다.',
    recordsCta: {
      label: '사례 전체 보기',
      href: `${SPOKEDU_BASE_PATH}/records`,
      trackLabel: 'cta-home-cases-records',
    },
    consultCta: {
      label: '기관수업 알아보기',
      href: `${SPOKEDU_BASE_PATH}/dispatch`,
      trackLabel: 'cta-home-cases-dispatch',
    },
    proofStats: [
      { value: '정규·늘봄', label: '키움센터·학교 연계 운영' },
      { value: '원데이·행사', label: '축제·특별활동 구성' },
      { value: '특수·SPOMOVE', label: '통합반·에듀테크 현장 적용' },
    ] as const,
    cards: [
      featuredCase,
      buildHomeCaseCard('maedong-sports-stepup'),
      buildHomeCaseCard('donghaeng-special-pe'),
    ],
  },

  evidenceStrip: {
    id: 'evidence',
    eyebrow: '확인 가능한 기준',
    items: [
      { value: '현장 직접 운영', label: '기관·개인 수업을 스포키듀가 설계·진행' },
      { value: 'SPOMOVE 자체 콘텐츠', label: '화면 신호와 움직임을 연결하는 활동' },
      { value: '기관·학교·복지 적용', label: '공개 사례로 확인되는 현장 범주' },
      { value: '구독시스템 연결', label: '지도자 준비·진행·기록 경로' },
    ] as const satisfies readonly HomeTrustStat[],
  },

  /**
   * About 전용 참조 유지. 홈 섹션6은 `evidenceStrip`.
   * 수치 카운트업·미검증 누적치는 넣지 않음.
   */
  trustStrip: {
    id: 'trust',
    eyebrow: '운영 경험',
    items: buildAboutTrustStripItems(),
  },

  finalCta: {
    id: 'contact-cta',
    headlineLines: ['필요한 수업과 도입 방식부터', '이야기해 주세요.'] as const,
    lead: '기관 프로그램, 개인·소그룹 수업, 구독시스템, 협업까지 필요한 방식으로 안내합니다.',
    support: '아직 프로그램이 정해지지 않았어도 목적과 조건을 기준으로 함께 정리할 수 있습니다.',
    notes: ['기관 조건', '아이 조건', '구독·협업'] as const,
    items: [
      {
        label: '체육교육 알아보기',
        href: SPOKEDU_PATHS.education,
        trackLabel: 'cta-home-final-education',
      },
      {
        label: 'SPOMOVE 알아보기',
        href: SPOKEDU_PATHS.spomove,
        trackLabel: 'cta-home-final-spomove',
      },
      {
        label: '구독시스템 알아보기',
        href: `${SPOKEDU_PATHS.subscription}`,
        trackLabel: 'cta-home-final-curriculum',
        commercialRoute: 'curriculum' as const,
      },
      {
        label: '문의·협업',
        href: SPOKEDU_PATHS.contact,
        trackLabel: 'cta-home-final-partner',
      },
    ] as const,
  },
} as const;

/** @deprecated site-ia.test 호환 */
export const homePageLegacyAudiencePaths = {
  id: 'paths',
  items: [] as const,
};
