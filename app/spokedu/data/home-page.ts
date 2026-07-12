import {
  catalogItemToHomeCard,
  getFieldRecordCatalogItem,
  type FieldRecordSlug,
} from './field-records-catalog';
import type { HomeMediaKey } from './home-media';
import { SPOKEDU_BASE_PATH } from './site';

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

export type HomeHeroQuickLink = {
  label: string;
  href: string;
  trackLabel: string;
};

/** 메인 홈 운영 사례 3건 — 카탈로그 원천 데이터만 사용 */
export const HOME_MAIN_CASE_SLUGS: readonly FieldRecordSlug[] = [
  'dongjak-spomove',
  'yangcheon-paps',
  'dasarang-oneday',
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
    mediaKey: item.slug === 'dongjak-spomove' ? 'homeHero' : card.mediaKey,
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
    primaryCta: {
      label: '기관 프로그램 문의',
      href: `${SPOKEDU_BASE_PATH}/contact?type=dispatch`,
      trackLabel: 'cta-home-contact-hero',
    },
    secondaryCta: {
      label: '개인수업 상담',
      href: `${SPOKEDU_BASE_PATH}/contact?type=private`,
      trackLabel: 'cta-home-audience-gate-hero',
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
        label: 'SPOMOVE 도입',
        href: `${SPOKEDU_BASE_PATH}/programs/spomove`,
        trackLabel: 'cta-home-hero-quick-spomove',
      },
    ] as const satisfies readonly HomeHeroQuickLink[],
    mediaCaption: {
      label: '대표 현장',
      title: '스크린 신호에 반응하는 SPOMOVE 기관 수업',
    },
  },
  proofStrip: {
    id: 'proof',
    items: [
      '2020년부터 직접 운영',
      '체육교육 전공 운영진',
      '기관·개인·특수체육 수업 경험',
    ] as const,
    processLine:
      '현장 수업 → 아이 반응 관찰 → 프로그램 표준화 → 기관별 운영안 제안' as const,
  },
  audienceGate: {
    id: 'paths',
    title: '어떤 수업이 필요하신가요?',
    items: [
      {
        id: 'dispatch',
        badge: '기관 담당자용',
        title: '기관 정규·행사 수업',
        description: '키움센터·학교·복지관의 공간, 인원, 일정에 맞춰 체육 프로그램을 구성합니다.',
        bullets: ['정규수업', '원데이 행사', '방학 프로그램'] as const,
        ctaLabel: '기관 운영안 보기',
        href: `${SPOKEDU_BASE_PATH}/dispatch`,
        trackLabel: 'cta-home-gate-dispatch',
        mediaKey: 'proofYangcheon',
      },
      {
        id: 'private',
        badge: '학부모용',
        title: '1:1·소그룹 개인수업',
        description: '아이의 운동 경험, 자신감, 사회성 목표에 맞춰 방문형 수업을 설계합니다.',
        bullets: ['기초 움직임', '운동 자신감', '맞춤 피드백'] as const,
        ctaLabel: '개인수업 보기',
        href: `${SPOKEDU_BASE_PATH}/private`,
        trackLabel: 'cta-home-gate-private',
        mediaKey: 'homeHero',
      },
      {
        id: 'curriculum',
        badge: '도입·협업용',
        title: 'SPOMOVE·커리큘럼 도입',
        description: '스크린 반응활동과 수업안을 기관 운영 흐름에 맞춰 적용합니다.',
        bullets: ['SPOMOVE', '커리큘럼', '강사교육'] as const,
        ctaLabel: '도입 방식 보기',
        href: `${SPOKEDU_BASE_PATH}/curriculum`,
        trackLabel: 'cta-home-gate-curriculum',
        mediaKey: 'gateCurriculum',
      },
    ] satisfies HomeAudienceGateItem[],
  },
  spomove: {
    id: 'spomove',
    title: 'SPOMOVE는 화면을 보는 수업이 아니라',
    titleLine2: '보고 판단하고 움직이는 수업입니다.',
    lead: '빔 화면의 색상·위치·방향·리듬 신호를 보고 4색 패드 위에서 움직입니다. 아이의 연령, 공간, 인원에 맞춰 속도와 규칙을 조절해 정규수업·행사·통합반에 적용할 수 있습니다.',
    flowSteps: [
      { label: '인지', hint: '화면 확인' },
      { label: '선택', hint: '반응 결정' },
      { label: '수행', hint: '몸으로 실행' },
      { label: '조절', hint: '속도·동작 조정' },
    ] as const satisfies readonly HomeSpomoveFlowStep[],
    proofs: [
      { value: '공간 맞춤', label: '강당·교실·센터룸 운영' },
      { value: '난이도 조절', label: '연령·대상별 속도와 규칙 변경' },
      { value: '기관 적용', label: '정규수업·행사·통합반 구성' },
    ] as const satisfies readonly HomeSpomoveProof[],
    mediaKey: 'trackDispatch' as HomeMediaKey,
    primaryCta: {
      label: 'SPOMOVE 자세히 보기',
      href: `${SPOKEDU_BASE_PATH}/programs/spomove`,
      trackLabel: 'cta-home-spomove-section',
    },
    secondaryCta: {
      label: 'SPOMOVE 도입 문의',
      href: `${SPOKEDU_BASE_PATH}/contact?type=spomove`,
      trackLabel: 'cta-home-spomove-dispatch',
    },
  },
  cases: {
    id: 'cases',
    title: '실제 기관 운영 사례',
    lead: '공간, 대상, 운영 목적에 맞춰 실제로 구성하고 진행한 수업 기록입니다.',
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
