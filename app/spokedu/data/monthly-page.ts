import type { HomeMediaKey } from './home-media';
import { SPOKEDU_BASE_PATH } from './site';

export const monthlyPage = {
  hero: {
    title: '월간 스포키듀',
    subtitle: '기관·프로그램 운영을 월 단위로 기록합니다.',
  },
  heroMediaKey: 'proofMonthly' as HomeMediaKey,
  highlightLabels: ['함께한 기관', '운영 프로그램', '수업 포인트', '다음 설계'] as const,
  archiveSlugs: ['2026-05', '2026-04'] as const,
  curriculumFlow: [
    { step: '01', title: '현장 수업', description: '기관·가정 현장에서 운영합니다.' },
    { step: '02', title: '관찰·기록', description: '참여·반응·협동을 남깁니다.' },
    { step: '03', title: '콘텐츠화', description: '수업안·매뉴얼로 정리합니다.' },
  ],
  cta: {
    primary: { label: '수업 사례 보기', href: `${SPOKEDU_BASE_PATH}/cases`, trackLabel: 'monthly-cta-cases' },
    secondary: {
      label: '기관수업 제안',
      href: `${SPOKEDU_BASE_PATH}/contact?type=dispatch`,
      trackLabel: 'monthly-cta-contact',
    },
  },
  ctaMediaKey: 'proofLab' as HomeMediaKey,
} as const;
