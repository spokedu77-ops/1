import {
  catalogItemToHomeCard,
  getFieldRecordCatalogItem,
  type FieldRecordSlug,
} from './field-records-catalog';
import type { HomeMediaKey } from './home-media';
import {
  AUDIENCE_TRACK_ORDER,
  AUDIENCE_TRACK_PATHS,
  HOME_PROGRAM_SYSTEM_ID,
  type AudienceTrackId,
  SPOKEDU_BASE_PATH,
} from './site';

export type { HomeFieldRecordCardFromCatalog as HomeFieldRecordCard } from './field-records-catalog';

export type HomeBusinessPath = {
  trackId: AudienceTrackId;
  title: string;
  lead: string;
  bullets: readonly string[];
  href: string;
  cta: string;
  trackLabel: string;
  mediaKey: HomeMediaKey;
};

export type HomeProgramCategory = 'education' | 'operation';

export type HomeProgramItem = {
  id: string;
  name: string;
  description: string;
  audience: string;
  category: HomeProgramCategory;
  href: string;
  trackLabel: string;
  mediaKey: HomeMediaKey;
};

export type HomeCaseCard = {
  slug: string;
  tagline: string;
  venue: string;
  sessionLine: string;
  operationType: string;
  description: string;
  href: string;
  ctaLabel: string;
  trackLabel: string;
  mediaKey: HomeMediaKey;
  blogImageIndex?: number;
};

const businessPathCopy: Record<
  AudienceTrackId,
  Pick<HomeBusinessPath, 'title' | 'lead' | 'bullets' | 'cta' | 'trackLabel' | 'mediaKey'>
> = {
  dispatch: {
    title: '기관·단체 체육교육',
    lead: '키움센터·학교·복지관·아동시설의 공간과 운영 목적에 맞춘 프로그램을 설계합니다.',
    bullets: ['정규수업·원데이·방학캠프', '인원·공간·목적 맞춤 운영', 'PAPS·SPOMOVE·놀이체육 연계'] as const,
    cta: '기관수업 보기',
    trackLabel: 'cta-home-path-dispatch',
    mediaKey: 'trackDispatch',
  },
  private: {
    title: '개인·소그룹 수업',
    lead: '운동 경험과 목표에 맞춘 1:1·2~4명 수업으로 기초 움직임과 운동 자신감을 다룹니다.',
    bullets: ['기초 움직임·운동 자신감', '종목 준비·체력 보완', '연령·성향 맞춤 설계'] as const,
    cta: '개인수업 보기',
    trackLabel: 'cta-home-path-private',
    mediaKey: 'trackPrivate',
  },
  curriculum: {
    title: '커리큘럼·강사교육',
    lead: '현장 수업을 반복 가능한 콘텐츠로 확장하는 수업안·운영 매뉴얼·강사교육을 제공합니다.',
    bullets: ['수업안·운영 매뉴얼', '강사교육·라이선싱', 'SPOMOVE 도입 지원'] as const,
    cta: '커리큘럼 보기',
    trackLabel: 'cta-home-path-curriculum',
    mediaKey: 'gateCurriculum',
  },
};

const HOME_CASE_SLUGS: readonly FieldRecordSlug[] = [
  'yangcheon-paps',
  'dongjak-spomove',
  'dasarang-oneday',
  'seodaemun-event-booth',
] as const;

const CASE_CTA_LABELS: Record<string, string> = {
  'yangcheon-paps': '정규수업 기록',
  'dongjak-spomove': 'SPOMOVE 수업 기록',
  'dasarang-oneday': '원데이 운영 보기',
  'playz-lounge': '캠프 사례 보기',
  'seodaemun-event-booth': '행사 현장 보기',
};

export function buildHomeCaseCards(): HomeCaseCard[] {
  const catalogCards = HOME_CASE_SLUGS.map((slug) => {
    const item = getFieldRecordCatalogItem(slug);
    const card = catalogItemToHomeCard(item);
    return {
      slug: card.slug,
      tagline: item.programLabel,
      venue: card.venue,
      sessionLine: card.sessionLine,
      operationType: item.operationType,
      description: item.description,
      href: card.href,
      ctaLabel: CASE_CTA_LABELS[slug] ?? '기록 보기',
      trackLabel: card.trackLabel,
      mediaKey: card.mediaKey,
      blogImageIndex: card.blogImageIndex,
    };
  });

  const playz: HomeCaseCard = {
    slug: 'playz-lounge',
    tagline: '방학캠프',
    venue: 'PLAYZ Lounge',
    sessionLine: '초등 · 체육·예체능 결합 방학 프로그램',
    operationType: '방학캠프',
    description: '체육과 예체능을 결합한 초등 방학 집중 프로그램 운영 사례입니다.',
    href: `${SPOKEDU_BASE_PATH}/programs/camp`,
    ctaLabel: CASE_CTA_LABELS['playz-lounge'],
    trackLabel: 'cta-home-case-playz',
    mediaKey: 'proofLounge',
  };

  return [
    catalogCards[0],
    catalogCards[1],
    catalogCards[2],
    playz,
    catalogCards[3],
  ];
}

export const homePage = {
  hero: {
    id: 'hero',
    lines: ['다양한 움직임의 경험을 설계하고,', '현장에서 검증한 체육교육을 운영합니다.'] as const,
    support:
      '개인수업부터 기관 프로그램, SPOMOVE와 커리큘럼까지 현장에서 검증한 체육교육을 설계합니다.',
    mediaKey: 'homeHero' as HomeMediaKey,
    primaryCta: {
      label: '기관 프로그램 제안받기',
      href: `${SPOKEDU_BASE_PATH}/contact?type=dispatch`,
      trackLabel: 'cta-home-dispatch-hero',
    },
    secondaryCta: {
      label: '개인수업 알아보기',
      href: `${SPOKEDU_BASE_PATH}/private`,
      trackLabel: 'cta-home-private-hero',
    },
    spomoveLink: {
      label: 'SPOMOVE 자세히 보기',
      href: `${SPOKEDU_BASE_PATH}/programs/spomove`,
      trackLabel: 'cta-home-spomove-hero',
    },
  },
  expertise: {
    id: 'expertise',
    headline: '현장에서 직접 가르친 경험을\n수업의 기준과 프로그램으로 만듭니다.',
    proofs: [
      '체육교육 전공 운영진',
      '2020년부터 현장 수업 운영',
      '개인·기관수업 직접 진행',
      'SPOMOVE와 커리큘럼 개발',
    ] as const,
    mediaKey: 'gateCurriculum' as HomeMediaKey,
  },
  businessPaths: {
    id: 'paths',
    items: AUDIENCE_TRACK_ORDER.map((trackId) => {
      const copy = businessPathCopy[trackId];
      return {
        trackId,
        ...copy,
        href: `${SPOKEDU_BASE_PATH}${AUDIENCE_TRACK_PATHS[trackId]}`,
      };
    }) satisfies HomeBusinessPath[],
  },
  /** @deprecated site-ia.test 호환 — businessPaths와 동일 */
  audiencePaths: {
    id: 'paths',
    items: AUDIENCE_TRACK_ORDER.map((trackId) => {
      const copy = businessPathCopy[trackId];
      return {
        trackId,
        audience:
          trackId === 'dispatch' ? '기관·단체' : trackId === 'private' ? '학부모' : '지도자·기관',
        title: copy.title,
        lead: copy.lead,
        href: `${SPOKEDU_BASE_PATH}${AUDIENCE_TRACK_PATHS[trackId]}`,
        trackLabel: copy.trackLabel,
        mediaKey: copy.mediaKey,
      };
    }),
  },
  spomove: {
    id: 'spomove',
    title: 'SPOMOVE 시지각 에듀테크 체육',
    lead: '스크린의 색과 위치를 보고, 4색 패드 위에서 몸으로 따라 합니다. 보고 → 선택하고 → 움직이고 → 조절하는 수업 흐름으로 난이도를 맞춥니다.',
    flow: ['인지', '선택', '수행', '조절'] as const,
    flowPlain: ['화면을 본다', '신호를 고른다', '패드 위에서 움직인다', '속도와 동작을 조절한다'] as const,
    points: [
      '일반 아동부터 특수·느린학습자까지 난이도 조절',
      '개인수업·기관수업·강사 콘텐츠로 확장',
      '스포키듀가 직접 개발·운영하는 교육 방식',
    ] as const,
    mediaKey: 'programSpomove' as HomeMediaKey,
    primaryCta: {
      label: 'SPOMOVE 자세히 보기',
      href: `${SPOKEDU_BASE_PATH}/programs/spomove`,
      trackLabel: 'cta-home-spomove-section',
    },
    secondaryCta: {
      label: '기관 도입 문의',
      href: `${SPOKEDU_BASE_PATH}/contact?type=dispatch`,
      trackLabel: 'cta-home-spomove-dispatch',
    },
  },
  programs: {
    id: HOME_PROGRAM_SYSTEM_ID,
    title: '주요 프로그램',
    lead: 'SPOMOVE 이외에 기관·개인 현장에서 운영 중인 대표 프로그램입니다.',
    featured: {
      id: 'paps',
      name: 'PAPS 연계 놀이체육',
      description: '체력평가 요소를 놀이형 수업으로 경험하는 기관 정규 프로그램',
      audience: '초등 · 기관 정규수업',
      category: 'education',
      href: `${SPOKEDU_BASE_PATH}/programs/paps`,
      trackLabel: 'cta-home-program-paps',
      mediaKey: 'programPaps' as HomeMediaKey,
    } satisfies HomeProgramItem,
    list: [
      {
        id: 'monthly-newsports',
        name: '월간 뉴스포츠',
        description: '매월 테마가 바뀌는 협동·교구 기반 뉴스포츠 수업',
        audience: '초등 · 기관 정규·방학',
        category: 'education',
        href: `${SPOKEDU_BASE_PATH}/programs/monthly-newsports`,
        trackLabel: 'cta-home-program-monthly-newsports',
        mediaKey: 'programMonthlyNewsports' as HomeMediaKey,
      },
      {
        id: 'oneday',
        name: '원데이 체육행사',
        description: '기관 행사·특별활동에 맞춘 90분~ 반일 체육 프로그램',
        audience: '기관·센터 · 원데이·행사',
        category: 'operation',
        href: `${SPOKEDU_BASE_PATH}/programs/oneday-event`,
        trackLabel: 'cta-home-program-oneday',
        mediaKey: 'programOneday' as HomeMediaKey,
      },
      {
        id: 'camp',
        name: '방학캠프',
        description: '체육과 예체능을 결합한 초등 방학 집중 프로그램',
        audience: '초등 · 방학·캠프',
        category: 'operation',
        href: `${SPOKEDU_BASE_PATH}/programs/camp`,
        trackLabel: 'cta-home-program-camp',
        mediaKey: 'programCamp' as HomeMediaKey,
      },
    ] satisfies HomeProgramItem[],
  },
  cases: {
    id: 'cases',
    title: '실제 운영 사례',
    lead: '키움센터·아동시설·공공 행사 등 현장에서 운영한 기록입니다.',
    featuredSlug: 'yangcheon-paps',
    recordsHref: `${SPOKEDU_BASE_PATH}/records`,
    recordsTrackLabel: 'cta-home-field-records',
    recordsLabel: '수업 사례 더 보기',
    cards: buildHomeCaseCards(),
  },
  educationSystem: {
    id: 'education-system',
    title: '운영진과 교육 설계 방식',
    headline: '현장 수업에서 시작해, 프로그램과 강사교육으로 확장합니다.',
    steps: [
      { label: '현장 수업', body: '기관·개인 현장에서 직접 수업을 운영합니다.' },
      { label: '아동 반응 관찰', body: '연령·경험·반응에 따라 활동과 난이도를 조정합니다.' },
      { label: '운영 방식 수정', body: '현장 피드백을 반영해 수업 순서와 도구를 다듬습니다.' },
      { label: '프로그램 표준화', body: '반복 가능한 수업안과 운영 기준으로 정리합니다.' },
      { label: '강사교육·확장', body: '커리큘럼과 SPOMOVE로 더 많은 현장에 전달합니다.' },
    ] as const,
    credentials:
      '연세대학교 체육교육학과 출신 운영진 · 체육교육 전공자 중심 · 실제 수업 운영 · 강사교육과 프로그램 개발',
    mediaKey: 'proofLab' as HomeMediaKey,
    cta: {
      label: '스포키듀 소개 보기',
      href: `${SPOKEDU_BASE_PATH}/about`,
      trackLabel: 'cta-home-about-system',
    },
  },
  finalCta: {
    id: 'contact-cta',
    headline: '프로그램과 운영 방식, 상담부터 시작하세요.',
    mediaKey: 'proofClass' as HomeMediaKey,
    primary: {
      label: '기관 프로그램 제안받기',
      href: `${SPOKEDU_BASE_PATH}/contact?type=dispatch`,
      trackLabel: 'cta-home-final-dispatch',
    },
    secondary: {
      label: '개인수업 상담하기',
      href: `${SPOKEDU_BASE_PATH}/contact?type=private`,
      trackLabel: 'cta-home-final-private',
    },
    link: {
      label: '커리큘럼·강사교육 문의',
      href: `${SPOKEDU_BASE_PATH}/contact?type=curriculum`,
      trackLabel: 'cta-home-final-curriculum',
    },
  },
} as const;
