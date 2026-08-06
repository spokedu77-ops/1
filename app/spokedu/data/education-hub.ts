import {
  getFieldRecordCatalogItem,
  type FieldRecordSlug,
} from './field-records-catalog';
import { SPOKEDU_BASE_PATH } from './site';

/** 체육교육 허브 사례 — 홈(dongjak)과 겹치지 않게 분산 */
export const EDUCATION_HUB_CASE_SLUGS = [
  'yangcheon-paps',
  'dasarang-oneday',
  'donghaeng-special-pe',
] as const satisfies readonly FieldRecordSlug[];

export type EducationHubCaseCard = {
  slug: FieldRecordSlug;
  venue: string;
  audience: string;
  operationType: string;
  programLabel: string;
  description: string;
  href: string;
  ctaLabel: string;
  trackLabel: string;
  thumbnailSrc?: string;
  mediaKey: string;
};

function buildEducationCaseCard(slug: FieldRecordSlug): EducationHubCaseCard {
  const item = getFieldRecordCatalogItem(slug);
  return {
    slug: item.slug,
    venue: item.venue,
    audience: item.meta,
    operationType: item.operationType,
    programLabel: item.programLabel,
    description: item.description,
    href: item.href,
    ctaLabel: '사례 보기',
    trackLabel: `education-case-${item.slug}`,
    thumbnailSrc: item.thumbnailSrc,
    mediaKey: item.mediaKey,
  };
}

/** 체육교육 허브 SSOT — 요약만, dispatch/private 본문 복제 금지 */
export const educationHubPage = {
  sectionOrder: [
    'hero',
    'primaryPaths',
    'formats',
    'principles',
    'cases',
    'finalCta',
  ] as const,

  hero: {
    id: 'hero',
    eyebrow: '체육교육',
    title: '현장과 대상에 맞춰 운영하는 아동·청소년 체육교육',
    lead:
      '학교·센터·복지관 등 기관수업과 개인·소그룹 수업을 직접 설계·운영합니다. 원데이·행사와 특수·포용 체육은 대상·공간·운영 목적에 따라 구성을 조정합니다.',
    primaryCta: {
      label: '기관수업 알아보기',
      href: `${SPOKEDU_BASE_PATH}/dispatch`,
      trackLabel: 'education-hero-dispatch',
    },
    secondaryCta: {
      label: '개인·소그룹 알아보기',
      href: `${SPOKEDU_BASE_PATH}/private`,
      trackLabel: 'education-hero-private',
    },
  },

  primaryPaths: {
    id: 'paths',
    eyebrow: '경로 선택',
    title: '기관수업과 개인·소그룹',
    lead: '이용 목적에 따라 두 경로로 나뉩니다. 어느 쪽이든 상세 조건과 상담은 각 페이지에서 이어집니다.',
    items: [
      {
        id: 'dispatch',
        badge: '기관 담당자',
        title: '기관수업',
        description:
          '학교·복지관·지역아동센터·공공기관·교육기관·센터의 정기수업, 방학·특강, 원데이·행사를 기관 조건에 맞춰 구성합니다.',
        bullets: ['정기수업', '방학·특강', '원데이·행사', '운영안 협의'] as const,
        ctaLabel: '기관수업 알아보기',
        href: `${SPOKEDU_BASE_PATH}/dispatch`,
        trackLabel: 'education-path-dispatch',
        mediaKey: 'trackDispatch' as const,
      },
      {
        id: 'private',
        badge: '학부모',
        title: '개인·소그룹',
        description:
          '아동 개인 또는 형제·친구 소그룹으로, 현재 수행 수준과 연령·공간을 확인한 뒤 상담으로 수업 방식을 정합니다.',
        bullets: ['수준 확인', '연령·인원 고려', '1:1·소그룹', '상담 후 결정'] as const,
        ctaLabel: '개인·소그룹 알아보기',
        href: `${SPOKEDU_BASE_PATH}/private`,
        trackLabel: 'education-path-private',
        mediaKey: 'trackSmallGroup' as const,
      },
    ] as const,
  },

  formats: {
    id: 'formats',
    eyebrow: '운영 형태',
    title: '체육교육 안의 주요 운영 형태',
    lead: '원데이·행사와 특수·포용 체육은 별도 사이트가 아니라 체육교육 서비스 안의 운영 형태·대상 범주입니다.',
    items: [
      {
        id: 'regular',
        title: '기관 정기수업',
        body: '일정 기간 반복 운영합니다. 대상과 공간에 맞춰 기본 움직임·놀이체육·뉴스포츠 등을 목적에 따라 조합합니다.',
        href: `${SPOKEDU_BASE_PATH}/dispatch`,
        ctaLabel: '기관 정기수업 안내',
        trackLabel: 'education-format-regular',
      },
      {
        id: 'private',
        title: '개인·소그룹 수업',
        body: '개인의 현재 수행 방식과 목표를 확인하고, 연령·인원·공간을 고려해 상담 후 수업 방식을 정합니다.',
        href: `${SPOKEDU_BASE_PATH}/private`,
        ctaLabel: '개인·소그룹 안내',
        trackLabel: 'education-format-private',
      },
      {
        id: 'oneday',
        title: '원데이·행사',
        body: '체육 행사, 팀빌딩, 미니올림픽, 방학 특강, 뉴스포츠 체험, 기관 행사처럼 일정형·단기 운영을 구성합니다.',
        href: `${SPOKEDU_BASE_PATH}/dispatch?program=oneday-event#programs`,
        ctaLabel: '원데이·행사 안내',
        trackLabel: 'education-format-oneday',
      },
      {
        id: 'inclusive',
        title: '특수·포용 체육',
        body: '참여자의 수행 방식과 수업 환경을 고려해 규칙·속도·교구·동선을 조정하고, 보조 인력과 기관 조건을 함께 확인합니다.',
        href: `${SPOKEDU_BASE_PATH}/dispatch?program=special-pe#programs`,
        ctaLabel: '특수·포용 안내',
        trackLabel: 'education-format-inclusive',
      },
    ] as const,
  },

  principles: {
    id: 'principles',
    eyebrow: '구성 원칙',
    title: '수업을 이렇게 구성합니다',
    lead: '대상과 환경에 맞춰 활동 목적·난이도를 정하고, 운영 중 관찰한 수행 방식을 다음 구성에 참고합니다.',
    steps: [
      {
        label: '대상과 환경 확인',
        body: '연령, 인원, 공간, 수업 시간, 교구·안전 동선을 먼저 확인합니다.',
      },
      {
        label: '목적과 난이도 설정',
        body: '활동 목적에 맞춰 규칙과 난이도를 단계적으로 안내합니다.',
      },
      {
        label: '수업 운영',
        body: '수행 방식에 따라 활동 구성과 동선을 현장에서 조정합니다.',
      },
      {
        label: '다음 수업 반영',
        body: '수업 중 관찰한 수행 방식을 다음 활동 구성에 참고합니다.',
      },
    ] as const,
    spomoveNote:
      '일부 수업에서는 화면과 움직임을 연결하는 SPOMOVE 콘텐츠를 활용합니다. 모든 수업에 포함되는 것은 아닙니다.',
    spomoveCta: {
      label: 'SPOMOVE 알아보기',
      href: `${SPOKEDU_BASE_PATH}/programs/spomove`,
      trackLabel: 'education-principles-spomove',
    },
  },

  cases: {
    id: 'cases',
    eyebrow: '현장 기록',
    title: '체육교육 대표 사례',
    lead: '공개된 운영 기록 중 기관 정기·원데이·특수체육 흐름이 드러나는 사례를 골랐습니다.',
    recordsCta: {
      label: '운영 사례 더 보기',
      href: `${SPOKEDU_BASE_PATH}/records`,
      trackLabel: 'education-cases-records',
    },
    cards: EDUCATION_HUB_CASE_SLUGS.map(buildEducationCaseCard),
  },

  finalCta: {
    id: 'final-cta',
    eyebrow: '다음 단계',
    title: '기관과 개인 중 어디로 이어갈까요?',
    lead: '운영 형태가 정해지지 않았어도 괜찮습니다. 대상·공간·일정을 알려주시면 맞는 경로로 안내합니다.',
    primary: {
      label: '기관 운영안 문의',
      href: `${SPOKEDU_BASE_PATH}/dispatch#contact`,
      trackLabel: 'education-final-dispatch',
    },
    secondary: {
      label: '개인·소그룹 상담',
      href: `${SPOKEDU_BASE_PATH}/private#apply`,
      trackLabel: 'education-final-private',
    },
    contactLink: {
      label: '그 밖의 문의·협업',
      href: `${SPOKEDU_BASE_PATH}/contact`,
      trackLabel: 'education-final-contact',
    },
  },

  /**
   * @deprecated PR1 최소 셸 호환 — `primaryPaths`·`formats` 사용.
   * 테스트·레거시 import용 평탄 링크.
   */
  paths: [
    {
      id: 'dispatch',
      badge: '기관',
      title: '기관수업',
      description: '공간·인원·일정에 맞춘 정규·행사형 기관 체육 운영.',
      href: `${SPOKEDU_BASE_PATH}/dispatch`,
      ctaLabel: '기관수업 알아보기',
      trackLabel: 'education-path-dispatch',
    },
    {
      id: 'private',
      badge: '개인',
      title: '개인·소그룹',
      description: '아이 조건에 맞춘 1:1·소그룹 체육수업 상담.',
      href: `${SPOKEDU_BASE_PATH}/private`,
      ctaLabel: '개인·소그룹 알아보기',
      trackLabel: 'education-path-private',
    },
    {
      id: 'oneday',
      badge: '행사',
      title: '원데이·행사',
      description: '축제·특별활동·시즌 일정에 맞춘 단기 체육 프로그램.',
      href: `${SPOKEDU_BASE_PATH}/dispatch?program=oneday-event#programs`,
      ctaLabel: '원데이·행사 안내',
      trackLabel: 'education-path-oneday',
    },
    {
      id: 'inclusive',
      badge: '포용',
      title: '특수·포용 체육',
      description: '통합반·특수체육 등 참여 조건을 맞춘 기관 운영 안내.',
      href: `${SPOKEDU_BASE_PATH}/dispatch?program=special-pe#programs`,
      ctaLabel: '포용 체육 안내',
      trackLabel: 'education-path-inclusive',
    },
  ] as const,

  /** @deprecated 최종 CTA의 contactLink 사용 */
  cta: {
    title: '어떤 경로가 맞는지 모르시겠다면',
    lead: '대상·공간·일정을 알려주시면 기관 또는 개인 경로로 안내합니다.',
    label: '그 밖의 문의·협업',
    href: `${SPOKEDU_BASE_PATH}/contact`,
    trackLabel: 'education-cta-contact',
  },
} as const;
