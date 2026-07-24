import {
  buildRecordsHeroSummary,
  catalogItemToHomeCard,
  getFieldRecordCatalogItem,
  type FieldRecordSlug,
} from './field-records-catalog';
import type { HomeMediaKey } from './home-media';
import { SPOKEDU_BASE_PATH } from './site';

/** about-history 기준 설립 연도 — 신뢰 수치 연수 계산용 */
const SPOKEDU_FOUNDED_YEAR = 2020;

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

/** 공개 카탈로그·설립연도 기준 — 추측 수치(120+ 등) 금지 */
function buildHomeTrustStripItems(): readonly HomeTrustStat[] {
  const summary = buildRecordsHeroSummary();
  const yearsOperating = Math.max(1, new Date().getFullYear() - SPOKEDU_FOUNDED_YEAR);
  return [
    { value: `${yearsOperating}년+`, label: '현장 수업·프로그램 운영' },
    { value: `${summary.venueTypeCount}유형`, label: '키움·학교·보건소 등 기관' },
    { value: `${summary.caseCount}건`, label: '공개 운영 사례' },
    { value: '정규·행사', label: '학기형부터 원데이까지' },
  ];
}

/** 메인 홈 운영 사례 4건 — 기관·프로그램 유형이 겹치지 않게 */
export const HOME_MAIN_CASE_SLUGS: readonly FieldRecordSlug[] = [
  'dongjak-spomove',
  'maedong-sports-stepup',
  'donghaeng-special-pe',
  'gangdong-health-pe',
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
    ctaLabel: '자세히 보기',
    trackLabel: card.trackLabel,
    mediaKey: card.mediaKey,
    blogImageIndex: card.blogImageIndex,
    thumbnailSrc: card.thumbnailSrc,
  };
}

export const homePage = {
  hero: {
    id: 'hero',
    lines: ['기관과 아이에게 맞는', '체육수업을 설계합니다.'] as const,
    support:
      '키움센터·학교·복지관의 단체수업부터 1:1 개인수업까지, 현장에서 검증한 프로그램과 SPOMOVE 활동으로 운영합니다.',
    mediaKey: 'homeHero' as HomeMediaKey,
    brand: 'SPOKEDU',
    youtubeVideoId: 'vv4f7Y9ea0k',
    youtubeTitle: '현장 영상 보기',
    youtubeTrackLabel: 'cta-home-hero-youtube',
    primaryCta: {
      label: '기관 프로그램 보기',
      href: `${SPOKEDU_BASE_PATH}/dispatch`,
      trackLabel: 'cta-home-dispatch-hero',
    },
    secondaryCta: {
      label: '개인수업 보기',
      href: `${SPOKEDU_BASE_PATH}/private`,
      trackLabel: 'cta-home-private-hero',
    },
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
        label: '커리큘럼·지도자 교육',
        href: `${SPOKEDU_BASE_PATH}/curriculum`,
        trackLabel: 'cta-home-hero-quick-curriculum',
      },
    ] as const satisfies readonly HomeHeroQuickLink[],
    mediaCaption: {
      label: '대표 현장',
      title: '기관·아동과 함께하는 체육수업 현장',
    },
  },
  trustStrip: {
    id: 'trust',
    eyebrow: '현장 기준',
    items: buildHomeTrustStripItems(),
  },
  proofStrip: {
    id: 'proof',
    title: '왜 스포키듀인가',
    lead: '수업을 직접 운영한 기준으로 프로그램을 설계하고, 그 기준을 지도자 교육까지 확장합니다.',
    items: [
      '직접 수업 운영',
      '기관 맞춤 프로그램 설계',
      'SPOMOVE 자체 개발',
      '지도자 세미나·커리큘럼 제공',
    ] as const,
    processLabel: '기준이 확장되는 흐름',
    processLine:
      '현장 수업 → 과정 설계 → 프로그램 표준화 → 지도자 교육·기관 운영안' as const,
  },
  audienceGate: {
    id: 'paths',
    title: '어떤 수업이 필요하신가요?',
    lead: '기관 수업, 개인·소그룹, 커리큘럼·지도자 교육까지. 목적에 맞는 안내를 이어드립니다.',
    items: [
      {
        id: 'dispatch',
        badge: '기관 담당자용',
        title: '기관 정규·행사 수업',
        description: '공간·인원·일정에 맞춰 정규·원데이·방학 프로그램을 구성합니다.',
        fit: '정기 수업, 행사, 방학 프로그램을 외부 강사와 안정적으로 운영해야 할 때',
        bullets: ['정규수업', '원데이 행사', '방학 프로그램'] as const,
        ctaLabel: '기관 운영안 보기',
        href: `${SPOKEDU_BASE_PATH}/dispatch`,
        trackLabel: 'cta-home-gate-dispatch',
        mediaKey: 'trackDispatch',
      },
      {
        id: 'private',
        badge: '학부모용',
        title: '1:1·소그룹 개인수업',
        description: '운동 경험·자신감·사회성 목표에 맞춘 방문형 1:1·소그룹 수업입니다.',
        fit: '운동 자신감, 기초체력, 종목 준비를 아이 속도에 맞춰 시작하고 싶을 때',
        bullets: ['기초 움직임', '운동 자신감', '맞춤 피드백'] as const,
        ctaLabel: '개인수업 보기',
        href: `${SPOKEDU_BASE_PATH}/private`,
        trackLabel: 'cta-home-gate-private',
        mediaKey: 'trackSmallGroup',
      },
      {
        id: 'curriculum',
        badge: '지도자·협업용',
        title: '커리큘럼·지도자 교육',
        description: '수업안·매뉴얼·SPOMOVE 도입 교육으로 현장 기준을 함께 만듭니다.',
        fit: '강사 교육, 수업안, 기관 컨설팅, SPOMOVE 도입이 필요할 때',
        bullets: ['지도자 교육', '수업안·매뉴얼', 'SPOMOVE 도입'] as const,
        ctaLabel: '교육·콘텐츠 보기',
        href: `${SPOKEDU_BASE_PATH}/curriculum`,
        trackLabel: 'cta-home-gate-curriculum',
        mediaKey: 'curriculumTools',
      },
    ] satisfies HomeAudienceGateItem[],
  },
  spomove: {
    id: 'spomove',
    title: '보고 판단하고 움직이는',
    titleLine2: '에듀테크 체육 SPOMOVE',
    lead: '색·위치·방향 신호를 읽고 4색 패드 위에서 바로 반응합니다. 키움센터·학교 강당에서도 정규·원데이·통합반으로 운영합니다.',
    flowSteps: [
      { label: '인지', hint: '신호 읽기' },
      { label: '선택', hint: '규칙 고르기' },
      { label: '수행', hint: '몸으로 실행' },
      { label: '조절', hint: '속도 맞추기' },
    ] as const satisfies readonly HomeSpomoveFlowStep[],
    proofs: [
      { value: '공간', label: '강당·교실·센터' },
      { value: '난이도', label: '연령·수준 맞춤' },
      { value: '운영', label: '정규·행사·통합반' },
    ] as const satisfies readonly HomeSpomoveProof[],
    useCases: [
      {
        title: '정규수업',
        body: '반복 참여로 신호 읽기와 움직임 반응을 단계적으로 연결합니다.',
      },
      {
        title: '원데이',
        body: '짧은 시간에도 직관적 규칙으로 몰입과 협동을 만듭니다.',
      },
      {
        title: '통합반',
        body: '속도와 신호 난이도를 조절해 모두가 참여 가능한 흐름을 만듭니다.',
      },
    ] as const satisfies readonly HomeSpomoveUseCase[],
    mediaKey: 'homeHeroWide' as HomeMediaKey,
    primaryCta: {
      label: 'SPOMOVE 자세히',
      href: `${SPOKEDU_BASE_PATH}/programs/spomove`,
      trackLabel: 'cta-home-spomove-section',
    },
    secondaryCta: {
      label: '도입 문의',
      href: `${SPOKEDU_BASE_PATH}/contact?type=spomove`,
      trackLabel: 'cta-home-spomove-dispatch',
    },
  },
  cases: {
    id: 'cases',
    title: '실제 기관 운영 사례',
    lead: '공간, 대상, 운영 목적에 맞춰 실제로 구성하고 진행한 수업 기록입니다.',
    recordsCta: {
      label: '사례 전체 보기',
      href: `${SPOKEDU_BASE_PATH}/records`,
      trackLabel: 'cta-home-cases-records',
    },
    consultCta: {
      label: '기관 운영 상담',
      href: `${SPOKEDU_BASE_PATH}/contact?type=dispatch`,
      trackLabel: 'cta-home-cases-consult',
    },
    proofStats: [
      { value: '정규수업', label: '키움센터·학교 연계 운영' },
      { value: '원데이', label: '행사·특별활동 구성' },
      { value: 'SPOMOVE', label: '스크린 반응활동 현장 적용' },
    ] as const,
    cards: HOME_MAIN_CASE_SLUGS.map(buildHomeCaseCard),
  },
  finalCta: {
    id: 'contact-cta',
    headlineLines: ['운영 환경을 알려주시면', '맞는 수업안부터 제안합니다.'] as const,
    lead: '기관 유형, 대상 연령, 참여 인원, 공간 조건을 기준으로 정규수업·행사·SPOMOVE·개인수업 중 적합한 방향을 안내합니다.',
    support: '아직 프로그램이 정해지지 않았어도 괜찮습니다. 목적과 조건을 먼저 듣고 가능한 운영안을 좁혀드립니다.',
    notes: ['대상 연령·인원 확인', '공간·일정 조건 정리', '프로그램 방향 제안'] as const,
    items: [
      {
        label: '기관 운영 상담',
        href: `${SPOKEDU_BASE_PATH}/contact?type=dispatch`,
        trackLabel: 'cta-home-final-dispatch',
      },
      {
        label: '개인수업 상담',
        href: `${SPOKEDU_BASE_PATH}/contact?type=private`,
        trackLabel: 'cta-home-final-private',
      },
      {
        label: '커리큘럼·지도자 교육',
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
