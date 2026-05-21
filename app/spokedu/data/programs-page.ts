import { SPOKEDU_BASE_PATH } from './site';

export const programsPage = {
  hero: {
    lines: ['스포키듀의', '수업 프로그램', '자산'] as const,
    subtitle: 'SPOMOVE·PAPS·원데이·캠프·커리큘럼 콘텐츠를 한곳에서 비교합니다.',
  },
  catalogTitle: '프로그램',
  tracksTitle: '운영 축별 연결',
  featured: {
    title: 'SPOMOVE',
    description: '보고, 선택하고, 반응하는 에듀테크 놀이체육',
    href: `${SPOKEDU_BASE_PATH}/programs/spomove`,
    trackLabel: 'programs-featured-spomove',
  },
  finalCta: {
    title: '목적에 맞는 조합이 필요하신가요?',
    description: '개인수업·기관 파견·커리큘럼 중 맞는 상담으로 연결합니다.',
    primary: {
      label: '기관 수업 제안',
      href: `${SPOKEDU_BASE_PATH}/contact?type=dispatch`,
      trackLabel: 'programs-cta-dispatch',
    },
    secondary: {
      label: '개인·소그룹 상담',
      href: `${SPOKEDU_BASE_PATH}/contact?type=private`,
      trackLabel: 'programs-cta-private',
    },
  },
} as const;
