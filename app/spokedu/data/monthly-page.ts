import type { HomeMediaKey } from './home-media';
import { SPOKEDU_BASE_PATH } from './site';

export const monthlyPage = {
  hero: {
    title: '매월 쌓이는\n스포키듀의 움직임 기록',
    subtitle: '기관·프로그램·움직임 변화를 월 단위 운영 증거로 정리합니다.',
  },
  heroMediaKey: 'proofMonthly' as HomeMediaKey,
  highlightLabels: ['함께한 기관', '운영한 프로그램', '아이들이 경험한 움직임', '교육 포인트'] as const,
  archiveSlugs: ['2026-05', '2026-04'] as const,
  curriculumFlow: [
    { step: '01', title: '현장 수업 운영', description: '기관·가정 현장에서 프로그램을 실행합니다.' },
    { step: '02', title: '움직임과 반응 관찰', description: '참여·반응·협동 포인트를 기록합니다.' },
    { step: '03', title: '수업안과 콘텐츠로 정리', description: '반복 가능한 커리큘럼 자산으로 전환합니다.' },
  ],
  cta: {
    primary: { label: '수업 사례 보기', href: `${SPOKEDU_BASE_PATH}/cases`, trackLabel: 'monthly-cta-cases' },
    secondary: {
      label: '수업 문의하기',
      href: `${SPOKEDU_BASE_PATH}/contact?type=dispatch`,
      trackLabel: 'monthly-cta-contact',
    },
  },
  ctaMediaKey: 'proofLab' as HomeMediaKey,
} as const;
