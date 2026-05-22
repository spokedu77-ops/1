import type { HomeMediaKey } from './home-media';
import { SPOKEDU_BASE_PATH } from './site';

export const campProgramPage = {
  hero: {
    kicker: '방학 · 하루 단위 몰입 프로그램',
    lines: ['방학 하루를', '움직임과 예체능', '경험으로 채웁니다'] as const,
    subtitle:
      '방학 기간 동안 아이들이 하루를 안전하고 의미 있게 보낼 수 있도록 체육, 미술, 댄스, 체스 등 예체능 활동을 결합해 운영합니다.',
    mediaKey: 'programCamp' as HomeMediaKey,
  },
  heroCta: {
    label: '방학캠프 운영 문의하기',
    href: `${SPOKEDU_BASE_PATH}/contact?type=dispatch`,
    trackLabel: 'program-camp-dispatch-hero',
  },
  overview: {
    title: '방학캠프란',
    body: '방학 기간 동안 아이들이 하루를 안전하고 의미 있게 보낼 수 있도록 체육, 미술, 댄스, 체스 등 예체능 활동을 결합해 운영하는 하루 단위 몰입형 프로그램입니다. 단순 체육특강이나 돌봄만이 아니라, 하루 전체를 설계한 교육 프로그램입니다.',
  },
  programBlocks: {
    title: '프로그램 구성',
    items: [
      {
        title: '체육활동',
        description: '기초 움직임, 협동 미션, 뉴스포츠, SPOMOVE 활동을 통해 몸을 움직입니다.',
        mediaKey: 'programCamp' as HomeMediaKey,
      },
      {
        title: '미술활동',
        description: '만들기와 표현 활동을 통해 아이들이 손으로 완성하는 경험을 합니다.',
        mediaKey: 'proofLounge' as HomeMediaKey,
      },
      {
        title: '댄스·리듬활동',
        description: '음악과 리듬에 맞춰 몸을 표현하고 움직임의 즐거움을 경험합니다.',
        mediaKey: 'programPlay' as HomeMediaKey,
      },
      {
        title: '체스·두뇌활동',
        description: '규칙, 순서, 전략을 경험하며 집중하는 시간을 만듭니다.',
        mediaKey: 'trackCurriculum' as HomeMediaKey,
      },
    ],
  },
  dailySchedule: {
    title: '하루 운영 흐름',
    note: '예시 일정 — 기관·공간 조건에 맞춰 조정합니다.',
    items: [
      { time: '10:00', label: '입실 및 오리엔테이션' },
      { time: '10:30', label: '체육활동' },
      { time: '12:00', label: '점심 및 휴식' },
      { time: '13:00', label: '예체능 활동' },
      { time: '14:30', label: '협동 미션 또는 SPOMOVE' },
      { time: '15:30', label: '정리 활동 및 피드백' },
      { time: '16:00', label: '귀가' },
    ] as const,
  },
  compare: {
    title: '원데이 이벤트와 무엇이 다른가요',
    oneday: {
      title: '원데이 이벤트',
      description: '기관 행사 일정에 맞춰 짧고 강한 체육 경험을 만드는 프로그램',
    },
    camp: {
      title: '방학캠프',
      description: '방학 기간 동안 하루 전체를 체육과 예체능 활동으로 구성하는 몰입형 프로그램',
    },
  },
  faq: {
    title: '학부모가 많이 묻는 질문',
    items: [
      {
        q: '몇 시부터 몇 시까지 운영하나요?',
        a: '기관·공간 일정에 맞춰 조정합니다. 보통 오전 10시 전후 입실, 오후 4시 전후 귀가 형태로 구성합니다.',
      },
      {
        q: '하루 종일 체육만 하나요?',
        a: '아닙니다. 체육과 미술, 댄스, 체스 등 예체능 활동을 번갈아 구성해 하루 전체의 균형을 맞춥니다.',
      },
      {
        q: '운동을 잘 못해도 참여할 수 있나요?',
        a: '가능합니다. 연령과 경험에 맞춰 난이도를 조절하며, 참여와 완성 경험을 중심으로 진행합니다.',
      },
      {
        q: '점심과 휴식 시간은 어떻게 운영되나요?',
        a: '점심·휴식 시간을 일정에 포함해 아이들이 무리하지 않도록 에너지를 관리합니다. 기관 조건에 맞춰 조율합니다.',
      },
      {
        q: '안전 관리는 어떻게 하나요?',
        a: '인원·공간·동선을 먼저 확인하고, 활동별 안전 범위를 정한 뒤 운영합니다. 휴식과 전환 시간도 함께 설계합니다.',
      },
    ] as const,
  },
  institutionFit: {
    title: '기관·공간 운영',
    body: '키즈 공간, 아동시설, 문화공간, 기관의 방학 시즌 프로그램으로 운영할 수 있습니다. 공간 규모, 이용 연령, 운영 시간, 인원에 맞춰 체육과 예체능 활동을 조합합니다.',
  },
  cases: {
    title: '실제 운영 예시',
    slugs: ['playz-camp'] as const,
    recordsHref: `${SPOKEDU_BASE_PATH}/cases/playz-camp`,
  },
  finalCta: {
    title: '방학 시즌 프로그램을 함께 운영하고 싶다면',
    description: '운영 기간, 공간, 대상 연령, 인원을 확인한 뒤 하루 단위 캠프 구성을 제안드립니다.',
    label: '방학캠프 운영 문의하기',
    href: `${SPOKEDU_BASE_PATH}/contact?type=dispatch`,
    trackLabel: 'program-camp-dispatch-final',
  },
} as const;
