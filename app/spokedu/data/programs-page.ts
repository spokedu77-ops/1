import { SPOKEDU_BASE_PATH } from './site';

export const programsPage = {
  hero: {
    lines: ['스포키듀', '수업 콘텐츠', '라인업'] as const,
    subtitle: 'SPOMOVE·PAPS·원데이·캠프·교육 패키지를 한곳에서 봅니다.',
  },
  catalogTitle: '라인업',
  tracksTitle: '운영 축',
  featured: {
    title: 'SPOMOVE',
    description: '빔 반응 에듀테크 놀이',
    href: `${SPOKEDU_BASE_PATH}/programs/spomove`,
    trackLabel: 'programs-featured-spomove',
  },
  finalCta: {
    title: '맞는 상담 연결',
    description: '기관·개인·콘텐츠 중 선택해 연결합니다.',
    primary: {
      label: '기관수업 제안',
      href: `${SPOKEDU_BASE_PATH}/contact?type=dispatch`,
      trackLabel: 'programs-cta-dispatch',
    },
    secondary: {
      label: '개인수업 상담',
      href: `${SPOKEDU_BASE_PATH}/contact?type=private`,
      trackLabel: 'programs-cta-private',
    },
  },
} as const;
