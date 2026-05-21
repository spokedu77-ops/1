import { SPOKEDU_BASE_PATH } from './site';

export const programsPage = {
  hero: {
    lines: ['수업 콘텐츠'] as const,
    subtitle: '현장에서 검증한 프로그램을 기관 운영과 커리큘럼 콘텐츠까지 연결해 안내합니다.',
  },
  catalogTitle: '프로그램',
  tracksTitle: '연결 축',
  finalCta: {
    title: '맞는 상담 연결',
    description: '학부모·기관·콘텐츠 목적 중 현재 상황에 맞는 문의 유형으로 연결합니다.',
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
