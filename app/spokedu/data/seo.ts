import type { Metadata } from 'next';
import { SPOKEDU_IMAGES } from './images';

export type SpokeduSeoPageKey =
  | 'home'
  | 'about'
  | 'private'
  | 'dispatch'
  | 'curriculum'
  | 'programs'
  | 'records'
  | 'cases'
  | 'monthly'
  | 'insights'
  | 'contact';

export type SeoMetaItem = {
  title: string;
  description: string;
};

export type SeoOgImage = {
  url: string;
  alt: string;
  width?: number;
  height?: number;
};

const SITE_NAME = 'SPOKEDU';

const CANONICAL: Record<SpokeduSeoPageKey, string> = {
  home: '/spokedu',
  about: '/spokedu/about',
  private: '/spokedu/private',
  dispatch: '/spokedu/dispatch',
  curriculum: '/spokedu/curriculum',
  programs: '/spokedu',
  records: '/spokedu/records',
  cases: '/spokedu/cases',
  monthly: '/spokedu/monthly',
  insights: '/spokedu/insights',
  contact: '/spokedu/contact',
};

const OG_BY_PAGE: Record<SpokeduSeoPageKey, SeoOgImage> = {
  home: {
    url: SPOKEDU_IMAGES.home.hero.src,
    alt: SPOKEDU_IMAGES.home.hero.alt,
    width: 1920,
    height: 1280,
  },
  about: {
    url: SPOKEDU_IMAGES.programs.spomove.src,
    alt: SPOKEDU_IMAGES.programs.spomove.alt,
  },
  private: {
    url: SPOKEDU_IMAGES.private.oneToOne.src,
    alt: SPOKEDU_IMAGES.private.oneToOne.alt,
  },
  dispatch: {
    url: SPOKEDU_IMAGES.dispatch.groupClass.src,
    alt: SPOKEDU_IMAGES.dispatch.groupClass.alt,
  },
  curriculum: {
    url: SPOKEDU_IMAGES.curriculum.lessonPlan.src,
    alt: SPOKEDU_IMAGES.curriculum.lessonPlan.alt,
  },
  programs: {
    url: SPOKEDU_IMAGES.programs.spomove.src,
    alt: SPOKEDU_IMAGES.programs.spomove.alt,
  },
  records: {
    url: SPOKEDU_IMAGES.records.lab.src,
    alt: SPOKEDU_IMAGES.records.lab.alt,
  },
  cases: {
    url: SPOKEDU_IMAGES.cases.representative.src,
    alt: SPOKEDU_IMAGES.cases.representative.alt,
  },
  monthly: {
    url: SPOKEDU_IMAGES.monthly.hero.src,
    alt: SPOKEDU_IMAGES.monthly.hero.alt,
  },
  insights: {
    url: SPOKEDU_IMAGES.curriculum.instructorTraining.src,
    alt: SPOKEDU_IMAGES.curriculum.instructorTraining.alt,
  },
  contact: {
    url: SPOKEDU_IMAGES.home.hero.src,
    alt: 'SPOKEDU 문의 — 개인수업·기관수업·커리큘럼 상담',
  },
};

export const seoMeta: Record<SpokeduSeoPageKey, SeoMetaItem> = {
  home: {
    title: 'SPOKEDU 스포키듀 | 현장 체육교육 운영 브랜드',
    description:
      '현장 수업에서 시작해 프로그램·커리큘럼 콘텐츠로 확장하는 아동·청소년 체육교육 운영 브랜드. 개인·기관·콘텐츠 3축 운영.',
  },
  about: {
    title: '스포키듀 소개 | 현장 체육교육 운영 브랜드',
    description:
      '대표 소개·연혁과 함께, 현장 수업에서 프로그램·커리큘럼으로 확장하는 아동·청소년 체육교육 운영 브랜드 SPOKEDU를 소개합니다.',
  },
  private: {
    title: '개인·소그룹 체육수업 | SPOKEDU',
    description:
      '아이의 연령과 성향에 맞춘 1:1·소그룹 체육수업. 기본 움직임과 운동 습관을 놀이 중심으로 설계하는 어린이 체육수업 상담을 받아보세요.',
  },
  dispatch: {
    title: '기관 파견 체육교육 | SPOKEDU',
    description:
      '키움센터·지역아동센터·학교에 맞춘 기관 체육수업과 원데이·정규 프로그램. 공간·인원·일정에 맞는 SPOMOVE·PAPS 운영안을 제안합니다.',
  },
  curriculum: {
    title: '체육 커리큘럼·콘텐츠 | SPOKEDU',
    description:
      '놀이체육 수업안, 운영 매뉴얼, 교구 활용, 강사 교육까지. 현장 수업을 반복 운영 가능한 체육 커리큘럼과 콘텐츠 도입을 안내합니다.',
  },
  programs: {
    title: 'SPOKEDU 프로그램 | SPOMOVE·PAPS·원데이·방학캠프',
    description:
      'SPOMOVE, PAPS, 원데이, 방학캠프, 커리큘럼 콘텐츠. 개인·기관·강사 운영에 맞는 프로그램을 한곳에서 확인합니다.',
  },
  records: {
    title: '현장기록 | 키움센터·학교·아동시설 수업 운영 기록',
    description:
      '키움센터, 학교, 아동시설, 문화공간 등 실제 운영 현장에서 진행한 수업과 프로그램 기록. 어디서, 누구에게, 어떤 프로그램을 운영했는지 확인하세요.',
  },
  cases: {
    title: '수업 운영 사례 | 기관 협업 SPOKEDU',
    description:
      '기관의 공간·대상·운영 목적에 맞춰 구성한 수업 사례. 운영 배경, 수업 구성, 현장 흐름과 운영 의미를 확인하세요.',
  },
  monthly: {
    title: '월간형 체육수업 | 월별 테마 SPOKEDU',
    description:
      '신체 기능·움직임 주제·교구·협동을 월별 테마로 구성하는 기관 정규·방과후 체육 커리큘럼. 월간 수업 흐름과 운영 방식을 확인하세요.',
  },
  insights: {
    title: '체육교육 관점 | SPOKEDU 인사이트',
    description:
      '현장 수업에서 관찰한 움직임·참여·반응을 바탕으로 수업 설계 기준과 체육교육 관점을 정리합니다. 학부모·기관·강사용.',
  },
  contact: {
    title: 'SPOKEDU 문의 | 개인수업·기관수업·커리큘럼 문의',
    description:
      '개인·소그룹 수업, 기관 파견, 커리큘럼·콘텐츠 문의를 유형별로 접수합니다. 목적에 맞는 상담으로 연결해 드립니다.',
  },
};

export const seoKeywords: Record<SpokeduSeoPageKey, readonly string[]> = {
  home: ['스포키듀', 'SPOKEDU', '아동 체육교육', '청소년 체육교육', 'SPOMOVE'],
  about: ['스포키듀', 'SPOKEDU', '아동 체육교육', '체육 커리큘럼'],
  private: ['개인 체육수업', '소그룹 체육수업', '어린이 체육수업', '아동 체육교육'],
  dispatch: ['기관 체육수업', '키움센터 체육 프로그램', 'SPOMOVE', 'PAPS 놀이체육'],
  curriculum: ['체육 커리큘럼', '놀이체육 수업안', '강사 교육', 'SPOMOVE'],
  programs: ['SPOMOVE', 'PAPS', '놀이체육', '방학캠프', '체육 커리큘럼'],
  records: ['현장기록', '키움센터 체육', 'SPOMOVE', '기관 체육수업', '방학캠프'],
  cases: ['수업 운영 사례', '기관 협업', '키움센터 체육', 'SPOMOVE', '방학캠프'],
  monthly: ['월간형 체육수업', '월별 테마', '기관 정규수업', '방과후 체육'],
  insights: ['체육교육 관점', '수업 설계', '아동 체육', 'SPOMOVE', '기관 체육'],
  contact: ['스포키듀 문의', '개인 체육수업', '기관 체육수업', '체육 커리큘럼'],
};

/** @deprecated seo.ts의 seoMeta.about 사용 */
export const seoMetaAboutPage = seoMeta.about;

/** @deprecated seo.ts의 seoMeta.cases 사용 */
export const seoMetaCases = seoMeta.cases;

/** @deprecated seo.ts의 seoMeta.monthly 사용 */
export const seoMetaMonthly = seoMeta.monthly;

/** @deprecated seo.ts의 seoMeta.insights 사용 */
export const seoMetaInsights = seoMeta.insights;

const PROGRAM_OG: Partial<Record<string, SeoOgImage>> = {
  spomove: { url: SPOKEDU_IMAGES.programs.spomove.src, alt: SPOKEDU_IMAGES.programs.spomove.alt },
  paps: { url: SPOKEDU_IMAGES.programs.paps.src, alt: SPOKEDU_IMAGES.programs.paps.alt },
  'monthly-newsports': {
    url: SPOKEDU_IMAGES.programs.newsportsMonthly.src,
    alt: SPOKEDU_IMAGES.programs.newsportsMonthly.alt,
  },
  'oneday-event': { url: SPOKEDU_IMAGES.programs.oneDay.src, alt: SPOKEDU_IMAGES.programs.oneDay.alt },
  camp: { url: SPOKEDU_IMAGES.programs.camp.src, alt: SPOKEDU_IMAGES.programs.camp.alt },
};

function resolveOgImage(pageKey?: SpokeduSeoPageKey, override?: SeoOgImage): SeoOgImage {
  if (override) return override;
  if (pageKey) return OG_BY_PAGE[pageKey];
  return OG_BY_PAGE.home;
}

export function buildSpokeduMetadata(page: SpokeduSeoPageKey): Metadata {
  const { title, description } = seoMeta[page];
  const canonical = CANONICAL[page];
  return buildSpokeduPageMetadata({
    title,
    description,
    canonical,
    keywords: [...seoKeywords[page]],
    pageKey: page,
  });
}

export function buildSpokeduPageMetadata({
  title,
  description,
  canonical,
  keywords = [],
  pageKey,
  ogImage,
}: SeoMetaItem & {
  canonical: string;
  keywords?: string[];
  pageKey?: SpokeduSeoPageKey;
  ogImage?: SeoOgImage;
}): Metadata {
  const image = resolveOgImage(pageKey, ogImage);
  const ogImages = [
    {
      url: image.url,
      width: image.width ?? 1200,
      height: image.height ?? 800,
      alt: image.alt,
    },
  ];

  return {
    title,
    description,
    keywords: keywords.length > 0 ? keywords : undefined,
    alternates: { canonical },
    openGraph: {
      type: 'website',
      locale: 'ko_KR',
      siteName: SITE_NAME,
      title,
      description,
      url: canonical,
      images: ogImages,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image.url],
    },
  };
}

export function buildProgramDetailOgImage(slug: string): SeoOgImage | undefined {
  return PROGRAM_OG[slug];
}
