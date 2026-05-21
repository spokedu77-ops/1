import { footerLinks, siteNavItems, SPOKEDU_BASE_PATH } from './site';

export { SPOKEDU_BASE_PATH };
export { seoMeta, seoKeywords } from './seo';

export type NavItem = {
  label: string;
  path: string;
  href: string;
};

/** @deprecated `siteNavItems` 사용 권장 */
export const navItems: NavItem[] = siteNavItems;

export const footerSiteLinks: NavItem[] = footerLinks;

export type TrustReasonCard = {
  title: string;
  description: string;
};

/** cases/[slug], monthly/[slug] 하단 신뢰 섹션 */
export const trustReasonCards: TrustReasonCard[] = [
  {
    title: '현장 운영 기록',
    description: '가정·기관 수업을 기록하고 프로그램에 반영합니다.',
  },
  {
    title: '맞춤 설계',
    description: '연령·공간·인원·목적을 함께 검토해 수업을 설계합니다.',
  },
  {
    title: '콘텐츠 표준화',
    description: '수업안·매뉴얼·강사 교육으로 운영을 맞춥니다.',
  },
  {
    title: '월간 아카이브',
    description: '월별 기록으로 개선 포인트를 누적합니다.',
  },
  {
    title: '프로그램 라인업',
    description: 'SPOMOVE·PAPS·놀이체육을 축별로 적용합니다.',
  },
];
