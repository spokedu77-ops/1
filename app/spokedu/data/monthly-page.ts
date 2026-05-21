import type { HomeMediaKey } from './home-media';
import { SPOKEDU_BASE_PATH } from './site';

export const monthlyPage = {
  hero: {
    title: '월간 스포키듀',
    subtitle: '기관 운영과 프로그램 변화를 월 단위로 기록하고 다음 설계 포인트까지 정리합니다.',
  },
  heroMediaKey: 'proofMonthly' as HomeMediaKey,
  highlightLabels: ['함께한 기관', '운영 프로그램', '수업 포인트', '다음 설계'] as const,
  archiveSlugs: ['2026-05', '2026-04'] as const,
  curriculumFlow: [
    { step: '01', title: '현장 수업', description: '기관·가정 환경에 맞춰 실제 수업을 운영하고 반응을 확인합니다.' },
    { step: '02', title: '관찰·기록', description: '참여도·움직임·협동 과정을 관찰해 운영 근거를 월간 단위로 남깁니다.' },
    { step: '03', title: '콘텐츠화', description: '기록을 수업안·매뉴얼·강사 공유 포인트로 정리해 다음 회차에 반영합니다.' },
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
