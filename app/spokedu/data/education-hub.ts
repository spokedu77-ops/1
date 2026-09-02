import {
  getFieldRecordCatalogItem,
  type FieldRecordSlug,
} from './field-records-catalog';
import { SPOKEDU_BASE_PATH, SPOKEDU_PATHS } from './site';

/** 체육교육 허브 사례 — 서비스 범위 증명 (정기 / 원데이 / 특수·포용) */
export const EDUCATION_HUB_CASE_SLUGS = [
  'yangcheon-paps',
  'dasarang-oneday',
  'donghaeng-special-pe',
] as const satisfies readonly FieldRecordSlug[];

export type EducationHubCaseRole = 'featured' | 'supporting';

export type EducationHubCaseCard = {
  slug: FieldRecordSlug;
  role: EducationHubCaseRole;
  venue: string;
  audience: string;
  operationType: string;
  programLabel: string;
  href: string;
  ctaLabel: string;
  trackLabel: string;
  thumbnailSrc: string;
  objectPosition?: string;
};

function buildEducationCaseCard(slug: FieldRecordSlug, role: EducationHubCaseRole): EducationHubCaseCard {
  const item = getFieldRecordCatalogItem(slug);
  return {
    slug: item.slug,
    role,
    venue: item.venue,
    audience: item.meta,
    operationType: item.operationType,
    programLabel: item.programLabel,
    href: item.href,
    ctaLabel: '사례 보기',
    trackLabel: `education-case-${item.slug}`,
    thumbnailSrc: item.thumbnailSrc!,
    objectPosition:
      slug === 'yangcheon-paps'
        ? '50% 45%'
        : slug === 'dasarang-oneday'
          ? '48% 42%'
          : '50% 40%',
  };
}

/** 체육교육 허브 SSOT — dispatch/private 본문 복제 금지 */
export const educationHubPage = {
  sectionOrder: ['hero', 'choice', 'institutional', 'difference', 'cases', 'contact'] as const,

  hero: {
    id: 'hero',
    eyebrow: '체육교육',
    lines: ['아동·청소년 체육수업을', '현장에 맞춰 직접 운영합니다.'] as const,
    lead:
      '학교·기관의 정기수업과 특강부터 개인·소그룹 수업까지 대상과 공간에 맞춰 직접 구성하고 운영합니다.',
    mediaKey: 'homeHeroField' as const,
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

  choice: {
    id: 'choice',
    institution: {
      title: '기관수업',
      body:
        '학교·복지관·지역아동센터·공공기관 등 기관의 대상·인원·공간·일정에 맞춰 수업 운영안을 구성합니다. 정기수업부터 방학·특강과 행사까지 운영 목적에 맞게 조정합니다.',
      ctaLabel: '기관수업 자세히 보기',
      href: `${SPOKEDU_BASE_PATH}/dispatch`,
      trackLabel: 'education-choice-dispatch',
      mediaKey: 'trackDispatch' as const,
    },
    private: {
      title: '개인·소그룹',
      body:
        '1:1 또는 소규모 수업으로 아동의 현재 수행 방식과 연령·인원과 공간을 확인해 수업을 구성합니다.',
      ctaLabel: '개인·소그룹 자세히 보기',
      href: `${SPOKEDU_BASE_PATH}/private`,
      trackLabel: 'education-choice-private',
    },
  },

  institutional: {
    id: 'institutional',
    titleLines: ['기관마다', '수업 조건이 다릅니다.'] as const,
    lead:
      '대상과 인원, 사용 가능한 공간과 시간, 운영 목적을 먼저 확인한 뒤 수업에 필요한 활동과 난이도, 교구와 동선을 구성합니다.',
    clientInputs: ['대상', '인원', '공간', '시간', '운영 목적'] as const,
    spokeduOutputs: ['활동 구성', '난이도', '교구', '동선', '회기 흐름'] as const,
    operationFormats: [
      {
        id: 'regular',
        index: '01',
        title: '정기수업',
        body: '일정 기간 반복 운영하는 체육수업입니다. 대상과 목적에 맞춰 기본 움직임, 놀이체육·뉴스포츠 등을 조합합니다.',
      },
      {
        id: 'seasonal',
        index: '02',
        title: '방학·특강',
        body: '방학 프로그램이나 일정 기간 집중 운영에 맞춰 회기 수와 수업 시간을 고려해 흐름을 구성합니다.',
      },
      {
        id: 'oneday',
        index: '03',
        title: '원데이·행사',
        body: '가족 체육행사, 미니운동회, 팀빌딩, 뉴스포츠 체험 등 하루 또는 단기 일정에 맞춰 운영합니다.',
      },
      {
        id: 'inclusive',
        index: '04',
        title: '특수·포용 체육',
        body: '참여자의 수행 방식과 수업 환경을 고려해 규칙·속도·교구·동선을 조정합니다.',
      },
    ] as const,
    cta: {
      label: '기관수업 운영안 보기',
      href: `${SPOKEDU_BASE_PATH}/dispatch`,
      trackLabel: 'education-institutional-dispatch',
    },
  },

  difference: {
    id: 'difference',
    titleLines: ['수업은', '현장에서 계속 조정됩니다.'] as const,
    body:
      '대상과 환경을 먼저 확인하고 수업 목적에 맞춰 활동과 난이도를 구성합니다. 실제 수업에서 확인한 수행 방식은 다음 활동과 회기 구성에 다시 반영합니다.',
    flow: ['사전 확인', '수업 구성', '현장 조정', '다음 회기 반영'] as const,
    steps: [
      {
        label: '사전 확인',
        body: '연령·인원·공간·시간과 안전 조건을 확인합니다.',
      },
      {
        label: '수업 구성',
        body: '활동 목적에 맞춰 난이도·교구·동선을 정합니다.',
      },
      {
        label: '현장 조정',
        body: '참여자의 실제 수행에 따라 규칙과 속도를 조정합니다.',
      },
      {
        label: '다음 회기 반영',
        body: '관찰한 수행 방식을 다음 수업 구성에 참고합니다.',
      },
    ] as const,
    spomoveNote:
      '일부 수업에서는 화면의 정보와 움직임을 연결하는 SPOKEDU의 SPOMOVE 콘텐츠를 활용할 수 있습니다. 모든 수업에 필수로 포함되는 것은 아닙니다.',
  },

  cases: {
    id: 'cases',
    title: '실제 운영 현장',
    lead: '정기수업부터 단기 프로그램과 특수·포용 체육까지 실제 운영 사례를 확인할 수 있습니다.',
    recordsCta: {
      label: '운영 사례 더 보기',
      href: `${SPOKEDU_BASE_PATH}/records`,
      trackLabel: 'education-cases-records',
    },
    cards: [
      buildEducationCaseCard('yangcheon-paps', 'featured'),
      buildEducationCaseCard('dasarang-oneday', 'supporting'),
      buildEducationCaseCard('donghaeng-special-pe', 'supporting'),
    ],
  },

  contact: {
    id: 'contact',
    titleLines: ['우리 기관에는', '어떤 방식이 맞는지 상담해보세요.'] as const,
    lead: '대상·인원·공간·일정을 알려주시면 상황에 맞는 수업 운영 방법을 안내합니다.',
    primaryCta: {
      label: '문의하기',
      href: `${SPOKEDU_PATHS.contact}`,
      trackLabel: 'education-contact-inquiry',
    },
    dispatchLink: {
      label: '기관수업 상세',
      href: `${SPOKEDU_BASE_PATH}/dispatch`,
      trackLabel: 'education-contact-dispatch',
    },
    privateLink: {
      label: '개인·소그룹 상세',
      href: `${SPOKEDU_BASE_PATH}/private`,
      trackLabel: 'education-contact-private',
    },
  },
} as const;
