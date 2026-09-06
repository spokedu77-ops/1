import {
  getFieldRecordCatalogItem,
  type FieldRecordSlug,
} from './field-records-catalog';
import { dispatchPage } from './dispatch-page';
import { SPOKEDU_BASE_PATH, SPOKEDU_PATHS } from './site';

const INSTITUTION_CONTACT_HREF = `${SPOKEDU_PATHS.contact}?type=dispatch`;

/** 체육교육 기관 사례 — 기존 기관수업 페이지 증명 슬롯 */
export const EDUCATION_HUB_CASE_SLUGS = [
  'yangcheon-paps',
  'dasarang-oneday',
  'donghaeng-special-pe',
] as const satisfies readonly FieldRecordSlug[];

export type EducationHubCaseCard = {
  slug: FieldRecordSlug;
  venue: string;
  displayMeta: string;
  audience: string;
  operationType: string;
  programLabel: string;
  href: string;
  trackLabel: string;
  thumbnailSrc: string;
  objectPosition?: string;
};

function buildEducationCaseCard(slug: FieldRecordSlug): EducationHubCaseCard {
  const item = getFieldRecordCatalogItem(slug);
  return {
    slug: item.slug,
    venue: item.venue,
    displayMeta: `${item.operationType} · ${item.programLabel}`,
    audience: item.meta,
    operationType: item.operationType,
    programLabel: item.programLabel,
    href: item.href,
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

/** /education = 기관·학교 체육교육 대표 sales page. 내용 SSOT는 기존 기관수업(dispatch) 페이지. */
export const educationHubPage = {
  sectionOrder: [
    'hero',
    'fit',
    'reviews',
    'comparison',
    'lineup',
    'operating',
    'cases',
    'process',
    'faq',
    'contact',
    'private',
  ] as const,

  hero: {
    id: 'hero',
    eyebrow: '체육교육 · 기관수업',
    lines: ['움직이게 하는 수업이 아니라,', '움직이고 싶게 만드는 수업입니다.'] as const,
    lead:
      '연세대학교 체육전공자들이 현장에서 운영해 온 수업을 바탕으로, 학교·키움센터·복지관 등 기관의 대상·인원·공간에 맞춰 체육수업을 구성합니다.',
    mediaKey: 'homeHeroFieldEducation' as const,
    primaryCta: {
      label: '기관 체육수업 상담하기',
      href: INSTITUTION_CONTACT_HREF,
      trackLabel: 'education-hero-consult',
    },
    secondaryCta: {
      label: '실제 운영 사례 보기',
      href: '#cases',
      trackLabel: 'education-hero-cases',
    },
  },

  fit: {
    id: 'fit',
    title: dispatchPage.decisionFit.title,
    lead: dispatchPage.decisionFit.lead,
    items: dispatchPage.decisionFit.items,
    whoFits: dispatchPage.whoFits,
    smallSpace: dispatchPage.smallSpace,
  },

  reviews: {
    id: 'reviews',
    title: '기관 담당자가 전하는 운영 경험',
    lead: '도입 효과를 수치로 단정하지 않습니다. 현장에서 담당자가 말한 운영 경험입니다.',
    items: dispatchPage.partnerReviews.items,
  },

  comparison: {
    id: 'comparison',
    title: dispatchPage.comparison.title,
    lead: dispatchPage.comparison.lead,
    rows: dispatchPage.comparison.rows,
  },

  lineup: {
    id: 'lineup',
    title: '기관 목적에 맞춘 수업 구성',
    lead: dispatchPage.programLineup.lead,
    core: {
      title: dispatchPage.coreCurriculum.title,
      paragraphs: [
        '펑셔널 무브로 기초 움직임을 다루고, 팀빌딩으로 협동과 건강한 경쟁 경험을 함께 설계합니다.',
        '기관 조건에 맞춰 이 베이스 위에 SPOMOVE·월간 스포츠·특수체육 등을 조합해 제안합니다.',
      ] as const,
    },
    spomoveNote:
      '일부 수업에서는 화면의 정보와 움직임을 연결하는 SPOKEDU의 SPOMOVE 콘텐츠를 활용합니다. 모든 수업에 필수로 포함되는 것은 아닙니다.',
    items: dispatchPage.programLineup.items.map((item) => {
      const paragraphs =
        item.id === 'spomove'
          ? ([
              '화면의 정보를 확인하고 규칙에 따라 판단한 뒤, 움직임으로 반응하는 SPOKEDU의 자체 신체활동 콘텐츠입니다.',
            ] as const)
          : item.paragraphs;
      return {
        ...item,
        paragraphs,
        href: item.id === 'spomove' ? item.href : undefined,
        trackLabel: item.id === 'spomove' ? item.trackLabel : undefined,
      };
    }),
  },

  operating: {
    id: 'operating',
    title: '운영 형태',
    lead: '정기수업부터 방학·특강, 원데이·행사까지 기관 일정에 맞춰 구성합니다.',
    formats: [
      {
        id: 'regular',
        title: '정기수업',
        body: '일정 기간 반복 운영하는 체육수업입니다. 대상과 목적에 맞춰 기본 움직임, 놀이체육·뉴스포츠 등을 조합합니다.',
      },
      {
        id: 'seasonal',
        title: '방학·특강',
        body: '방학 프로그램이나 일정 기간 집중 운영에 맞춰 회기 수와 수업 시간을 고려해 흐름을 구성합니다.',
      },
      {
        id: 'oneday',
        title: '원데이·행사',
        body: '가족 체육행사, 미니운동회, 팀빌딩, 뉴스포츠 체험 등 하루 또는 단기 일정에 맞춰 운영합니다.',
      },
      {
        id: 'inclusive',
        title: '특수·포용 체육',
        body: '참여자의 수행 방식과 수업 환경을 고려해 규칙·속도·교구·동선을 조정합니다.',
      },
    ] as const,
  },

  cases: {
    id: 'cases',
    title: '실제 운영 현장',
    lead: '정기수업부터 단기 프로그램과 특수·포용 체육까지 실제 운영 사례를 확인할 수 있습니다.',
    recordsCta: {
      label: '운영 사례 전체 보기',
      href: `${SPOKEDU_BASE_PATH}/records`,
      trackLabel: 'education-cases-records',
    },
    cards: [
      buildEducationCaseCard('yangcheon-paps'),
      buildEducationCaseCard('dasarang-oneday'),
      buildEducationCaseCard('donghaeng-special-pe'),
    ],
  },

  process: {
    id: 'process',
    title: dispatchPage.processOnePager.title,
    lead: dispatchPage.processOnePager.lead,
    flow: dispatchPage.processOnePager.flow,
    checklist: dispatchPage.processOnePager.checklist,
    formats: dispatchPage.processOnePager.formats,
  },

  faq: {
    id: 'faq',
    title: dispatchPage.faq.title,
    items: dispatchPage.faq.items,
  },

  contact: {
    id: 'contact',
    title: '기관에 맞는 체육수업을 상담해보세요.',
    lead: '대상·인원·공간·일정을 알려주시면 정규수업·원데이·방학 운영 중 맞는 구성을 안내합니다. 문의 유형을 다시 고르지 않아도 됩니다.',
    primaryCta: {
      label: '기관 체육수업 상담하기',
      href: INSTITUTION_CONTACT_HREF,
      trackLabel: 'education-contact-inquiry',
    },
  },

  private: {
    id: 'private',
    title: '개인·소그룹 수업을 찾고 계신가요?',
    lead: '1:1 또는 소규모 수업은 아동의 현재 수행 방식과 연령·인원·공간을 확인한 뒤 별도로 안내합니다.',
    cta: {
      label: '개인·소그룹 알아보기',
      href: `${SPOKEDU_BASE_PATH}/private`,
      trackLabel: 'education-private-secondary',
    },
  },
} as const;
