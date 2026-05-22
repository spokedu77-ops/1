import type { HomeMediaKey } from './home-media';
import { SPOKEDU_BASE_PATH } from './site';

export type ProgramsPageCard = {
  slug: string;
  title: string;
  description: string;
  fit: string;
  detailHref: string;
  ctaLabel: string;
  ctaTrack: string;
  mediaKey: HomeMediaKey;
};

export type ProgramsPageGroup = {
  title: string;
  lead: string;
  programs: ProgramsPageCard[];
};

export const programsPage = {
  hero: {
    lines: ['아이와 기관의 목적에 맞춰', '수업 프로그램을', '구성합니다'] as const,
    subtitle:
      '에듀테크 놀이체육, 체력 향상, 원데이 이벤트, 방학캠프까지 대상과 공간, 운영 목적에 맞춰 프로그램을 제안합니다.',
    mediaKey: 'programSpomove' as HomeMediaKey,
  },
  heroCtas: {
    primary: {
      label: '기관 프로그램 제안받기',
      href: `${SPOKEDU_BASE_PATH}/contact?type=dispatch`,
      trackLabel: 'programs-cta-dispatch',
    },
    secondary: {
      label: '프로그램 상담하기',
      href: `${SPOKEDU_BASE_PATH}/contact?type=dispatch`,
      trackLabel: 'programs-cta-consult',
    },
  },
  selectionGuide: {
    title: '목적별 빠른 선택',
    items: [
      { need: '몰입형 체육수업이 필요하다면', program: 'SPOMOVE' },
      { need: '체력 향상과 점검이 필요하다면', program: 'PAPS' },
      { need: '행사성 체험이 필요하다면', program: '원데이 이벤트' },
      { need: '방학 돌봄형 프로그램이 필요하다면', program: '방학캠프' },
    ] as const,
  },
  groups: [
    {
      title: '핵심 수업 콘텐츠',
      lead: '정규수업·방과후 시간표에 맞춰 운영하는 대표 프로그램입니다.',
      programs: [
        {
          slug: 'spomove',
          title: 'SPOMOVE',
          description:
            '시각 자극을 보고 몸으로 반응하는 빔 기반 에듀테크 놀이체육입니다.',
          fit: '키움센터, 초등 저학년, 몰입형 체육수업',
          detailHref: `${SPOKEDU_BASE_PATH}/programs/spomove`,
          ctaLabel: 'SPOMOVE 살펴보기',
          ctaTrack: 'cta-program-spomove',
          mediaKey: 'programSpomove',
        },
        {
          slug: 'paps',
          title: 'PAPS',
          description:
            '학교 체력평가 요소를 놀이형 수업으로 경험하는 체력 향상 프로그램입니다.',
          fit: '학교, 방과후, 체력 향상 목적 수업',
          detailHref: `${SPOKEDU_BASE_PATH}/programs/paps`,
          ctaLabel: 'PAPS 프로그램 보기',
          ctaTrack: 'cta-program-paps',
          mediaKey: 'programPaps',
        },
      ],
    },
    {
      title: '운영형 프로그램',
      lead: '행사·방학 일정에 맞춰 짧거나 집중적으로 운영하는 형태입니다.',
      programs: [
        {
          slug: 'oneday-event',
          title: '원데이 이벤트',
          description:
            '기관 행사 일정에 맞춰 짧고 몰입감 있게 구성하는 체육 이벤트입니다.',
          fit: '행사, 체험일, 특별활동',
          detailHref: `${SPOKEDU_BASE_PATH}/programs/oneday-event`,
          ctaLabel: '원데이 이벤트 문의하기',
          ctaTrack: 'cta-program-oneday-event',
          mediaKey: 'programOneday',
        },
        {
          slug: 'camp',
          title: '방학캠프',
          description:
            '방학 기간 동안 체육과 예체능 활동을 결합한 하루 단위 몰입 프로그램입니다.',
          fit: '방학 돌봄, 키즈 공간, 기관 캠프',
          detailHref: `${SPOKEDU_BASE_PATH}/programs/camp`,
          ctaLabel: '방학캠프 운영 문의하기',
          ctaTrack: 'cta-program-camp',
          mediaKey: 'programCamp',
        },
      ],
    },
  ] satisfies ProgramsPageGroup[],
  finalCta: {
    title: '어떤 프로그램이 맞을지 고민된다면',
    description:
      '대상 연령, 공간, 일정, 운영 목적을 확인한 뒤 적합한 프로그램을 안내드립니다.',
    primary: {
      label: '기관 프로그램 제안받기',
      href: `${SPOKEDU_BASE_PATH}/contact?type=dispatch`,
      trackLabel: 'programs-cta-dispatch-final',
    },
    secondary: {
      label: '프로그램 상담하기',
      href: `${SPOKEDU_BASE_PATH}/contact?type=dispatch`,
      trackLabel: 'programs-cta-consult-final',
    },
  },
} as const;
