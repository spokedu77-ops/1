import type { HomeMediaKey } from './home-media';
import { programSystemItems } from './program-system-items';
import { SPOKEDU_BASE_PATH } from './site';

export const programsPage = {
  hero: {
    kicker: '프로그램',
    lines: ['목적에 맞는', '체육 프로그램을', '고릅니다'] as const,
    subtitle:
      'SPOMOVE·PAPS·월간 뉴스포츠·원데이·방학캠프까지. 개인·기관·행사 목적에 맞춰 운영 형태를 선택하세요.',
    mediaKey: 'programSpomove' as HomeMediaKey,
  },
  heroCtas: {
    primary: {
      label: '상담 문의하기',
      href: `${SPOKEDU_BASE_PATH}/contact?type=dispatch`,
      trackLabel: 'programs-cta-contact',
    },
    secondary: {
      label: '기관 라인업 자세히',
      href: `${SPOKEDU_BASE_PATH}/dispatch#programs`,
      trackLabel: 'programs-cta-dispatch-lineup',
    },
  },
  list: {
    eyebrow: '라인업',
    title: '운영 중인 프로그램',
    lead: '각 카드에서 대상·운영 방식·현장 사례로 이어집니다.',
    items: programSystemItems,
  },
  finalCta: {
    title: '어떤 프로그램이 맞는지 같이 정해 보세요',
    description: '대상·인원·공간·일정을 알려주시면 정규·원데이·방학 중 적합한 운영안을 제안합니다.',
    mediaKey: 'programSpomove' as HomeMediaKey,
    primary: {
      label: '프로그램 상담받기',
      href: `${SPOKEDU_BASE_PATH}/contact?type=dispatch`,
      trackLabel: 'programs-final-contact',
    },
  },
} as const;
