import { SPOKEDU_BASE_PATH } from './site';

export const programsPage = {
  hero: {
    lines: ['수업 콘텐츠'] as const,
    subtitle: '현장에서 쓰는 프로그램과 교육 패키지.',
  },
  catalogTitle: '프로그램',
  tracksTitle: '연결 축',
  finalCta: {
    title: '맞는 상담 연결',
    description: '목적에 맞는 문의로 안내합니다.',
    primary: {
      label: '기관수업 제안',
      href: `${SPOKEDU_BASE_PATH}/contact?type=dispatch`,
      trackLabel: 'programs-cta-dispatch',
    },
    secondary: {
      label: '문의 유형 선택',
      href: `${SPOKEDU_BASE_PATH}/contact`,
      trackLabel: 'programs-cta-contact',
    },
  },
} as const;
