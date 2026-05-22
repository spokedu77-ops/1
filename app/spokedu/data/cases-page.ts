import type { HomeMediaKey } from './home-media';
import { SPOKEDU_BASE_PATH } from './site';

export type CaseFilterId = 'all' | 'regular' | 'oneday' | 'camp' | 'space';

export const caseFilters: { id: CaseFilterId; label: string }[] = [
  { id: 'all', label: '전체' },
  { id: 'regular', label: '정규수업' },
  { id: 'oneday', label: '원데이·행사' },
  { id: 'camp', label: '캠프' },
  { id: 'space', label: '공간 협업' },
];

export const casesPage = {
  hero: {
    kicker: '기관 협업 운영 사례',
    lines: ['기관과 함께 만든', '수업 운영 사례를 정리합니다'] as const,
    subtitle:
      '기관의 공간, 대상, 운영 목적에 맞춰 스포키듀가 실제로 구성하고 운영한 수업 사례를 정리했습니다.',
    mediaKey: 'programOneday' as HomeMediaKey,
  },
  roleCompare: {
    title: '현장 기록과 운영 사례의 차이',
    recordsLead:
      '어디서, 누구에게, 어떤 프로그램을 진행했는지 빠르게 확인하는 현장 활동 기록입니다.',
    casesLead:
      '기관 상황에 맞춘 수업 구성, 운영 배경, 현장 흐름과 운영 의미를 깊게 정리한 협업 사례입니다.',
    recordsHref: `${SPOKEDU_BASE_PATH}/records`,
    recordsLinkLabel: '현장 기록 보기',
  },
  casesSectionTitle: '운영 사례',
  cta: {
    title: '우리 기관에도 맞는 운영 사례를 만들고 싶다면',
    description:
      '기관의 공간, 대상, 일정, 운영 목적을 확인한 뒤 적합한 수업 형태를 제안드립니다.',
    label: '기관 프로그램 제안받기',
    href: `${SPOKEDU_BASE_PATH}/contact?type=dispatch`,
    trackLabel: 'cases-dispatch-cta',
  },
} as const;
