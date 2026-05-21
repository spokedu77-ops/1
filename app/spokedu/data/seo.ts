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
  programs: '/spokedu/programs',
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
  },
  about: {
    url: SPOKEDU_IMAGES.home.labScene.src,
    alt: SPOKEDU_IMAGES.home.labScene.alt,
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
    title: 'SPOKEDU 스포키듀 | 아동·청소년 체육교육 브랜드',
    description:
      '움직임을 교육으로 설계하는 스포키듀. 어린이·청소년 개인·소그룹 수업, 기관 체육교육, SPOMOVE·PAPS 프로그램과 체육 커리큘럼을 한 브랜드로 연결합니다.',
  },
  about: {
    title: 'SPOKEDU 소개 | 아동·청소년 체육교육 브랜드',
    description:
      '아이의 수업, 기관의 프로그램, 선생님의 커리큘럼을 연결하는 스포키듀. LAB 운영과 현장기록으로 검증한 체육교육 브랜드입니다.',
  },
  private: {
    title: '개인·소그룹 체육수업 | SPOKEDU Private Class',
    description:
      '아이의 연령과 성향에 맞춘 1:1·소그룹 체육수업. 기본 움직임과 운동 습관을 놀이 중심으로 설계하는 어린이 체육수업 상담을 받아보세요.',
  },
  dispatch: {
    title: '기관 파견 체육교육 | SPOKEDU Dispatch Solution',
    description:
      '키움센터·지역아동센터·학교에 맞춘 기관 체육수업과 원데이·정규 프로그램. 공간·인원·일정에 맞는 SPOMOVE·PAPS 운영안을 제안합니다.',
  },
  curriculum: {
    title: '체육 커리큘럼·콘텐츠 | SPOKEDU Curriculum',
    description:
      '놀이체육 수업안, 운영 매뉴얼, 교구 활용, 강사 교육까지. 현장 수업을 반복 운영 가능한 체육 커리큘럼과 콘텐츠 도입을 안내합니다.',
  },
  programs: {
    title: 'SPOKEDU 프로그램 | SPOMOVE·PAPS·원데이·방학캠프',
    description:
      'SPOMOVE, PAPS 놀이체육, 원데이, 방학캠프, 커리큘럼 콘텐츠. 개인·기관·강사 운영에 연결되는 스포키듀 프로그램 자산을 비교합니다.',
  },
  records: {
    title: '현장기록 | 수업 사례·월간 스포키듀',
    description:
      '키움센터·지역아동센터·행사 현장의 실제 수업 기록. 수업 사례, 월간 스포키듀, 교육 인사이트로 운영 실체를 확인하세요.',
  },
  cases: {
    title: '수업 사례 | SPOKEDU 현장 운영 기록',
    description:
      '기관·행사·프로그램별 실제 운영 사례. SPOMOVE, 원데이, 방학캠프 등 현장에서 검증한 수업을 카드로 빠르게 확인합니다.',
  },
  monthly: {
    title: '월간 스포키듀 | SPOKEDU 운영 기록',
    description:
      '월별 수업 운영과 커리큘럼 개발의 기록. 함께한 기관, 프로그램, 움직임 변화를 월간 아카이브로 정리합니다.',
  },
  insights: {
    title: '교육 인사이트 | SPOKEDU',
    description:
      '학부모·기관·강사 관점의 짧은 체육교육 인사이트. SPOMOVE, PAPS, 커리큘럼 운영 노하우를 읽기 쉽게 정리합니다.',
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
  records: ['현장기록', '수업 사례', '월간 스포키듀', '기관 체육수업'],
  cases: ['수업 사례', '키움센터 체육 프로그램', 'SPOMOVE', '기관 체육수업'],
  monthly: ['월간 스포키듀', '아동 체육교육', '기관 체육수업'],
  insights: ['교육 인사이트', '아동 체육교육', 'SPOMOVE', 'PAPS'],
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

export type SpokeduRelatedLink = {
  href: string;
  label: string;
  description: string;
};

export const seoRelatedLinks: Partial<Record<SpokeduSeoPageKey, SpokeduRelatedLink[]>> = {
  home: [
    { href: '/spokedu/private', label: '개인·소그룹 수업', description: '1:1·소그룹 체육수업 상담' },
    { href: '/spokedu/dispatch', label: '기관 파견', description: '키움·지역아동센터 프로그램' },
    { href: '/spokedu/programs', label: '프로그램 자산', description: 'SPOMOVE·PAPS·놀이체육' },
    { href: '/spokedu/records', label: '현장기록', description: '수업 사례·월간 기록' },
  ],
  private: [
    { href: '/spokedu/programs/spomove', label: 'SPOMOVE', description: '빔 기반 놀이체육 프로그램' },
    { href: '/spokedu/programs', label: '전체 프로그램', description: '수업에 쓰이는 콘텐츠 자산' },
    { href: '/spokedu/records', label: '수업 사례', description: '실제 운영 기록' },
    { href: '/spokedu/contact?type=private', label: '수업 상담', description: '개인·소그룹 문의' },
  ],
  dispatch: [
    { href: '/spokedu/programs/paps', label: 'PAPS 놀이체육', description: '기초체력 연계 프로그램' },
    { href: '/spokedu/cases', label: '기관 사례', description: '키움·지역아동센터 실행 기록' },
    { href: '/spokedu/curriculum', label: '커리큘럼', description: '수업안·운영 매뉴얼' },
    { href: '/spokedu/contact?type=dispatch', label: '제안 문의', description: '기관 파견 상담' },
  ],
  curriculum: [
    { href: '/spokedu/programs', label: '프로그램 자산', description: 'SPOMOVE·PAPS·콘텐츠' },
    { href: '/spokedu/records', label: '현장기록', description: '검증된 운영 사례' },
    { href: '/spokedu/insights', label: '교육 인사이트', description: '운영 관점 아카이브' },
    { href: '/spokedu/contact?type=curriculum', label: '도입 문의', description: '커리큘럼·제휴 상담' },
  ],
  programs: [
    { href: '/spokedu/private', label: 'Private Class', description: '개인·소그룹 적용' },
    { href: '/spokedu/dispatch', label: 'Dispatch', description: '기관 파견 적용' },
    { href: '/spokedu/curriculum', label: 'Curriculum', description: '수업안·강사 교육' },
    { href: '/spokedu/contact', label: '문의하기', description: '프로그램 조합 상담' },
  ],
  records: [
    { href: '/spokedu/cases', label: '수업 사례', description: '기관·행사별 상세 기록' },
    { href: '/spokedu/monthly', label: '월간 스포키듀', description: '월별 운영 아카이브' },
    { href: '/spokedu/programs', label: '프로그램', description: '사례에 연결된 콘텐츠' },
    { href: '/spokedu/contact', label: '문의하기', description: '운영·제안 상담' },
  ],
  contact: [
    { href: '/spokedu/private', label: '개인·소그룹', description: '아이 수업 문의' },
    { href: '/spokedu/dispatch', label: '기관 파견', description: '제안·행사 문의' },
    { href: '/spokedu/curriculum', label: '커리큘럼', description: '콘텐츠·제휴 문의' },
    { href: '/spokedu/programs', label: '프로그램 안내', description: '선택 전 비교' },
  ],
};

const PROGRAM_OG: Partial<Record<string, SeoOgImage>> = {
  spomove: { url: SPOKEDU_IMAGES.programs.spomove.src, alt: SPOKEDU_IMAGES.programs.spomove.alt },
  paps: { url: SPOKEDU_IMAGES.programs.paps.src, alt: SPOKEDU_IMAGES.programs.paps.alt },
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
