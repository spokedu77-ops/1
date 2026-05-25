import type { HomeMediaKey } from './home-media';
import { SPOKEDU_BASE_PATH } from './site';

export const monthlyNewsportsProgramPage = {
  hero: {
    kicker: 'SPOKEDU NEWSPORTS PROGRAM',
    lines: ['스포키듀', '뉴스포츠 12개 테마'] as const,
    subtitle:
      '아이들이 다양한 스포츠를 안전하고 즐겁게 경험할 수 있도록 구성한 스포키듀 뉴스포츠 프로그램입니다. 12개 테마는 현장 운영성·몰입도·기관 제안 적합도를 기준으로 정리했습니다.',
    mediaKey: 'programMonthlyNewsports' as HomeMediaKey,
  },
  heroCta: {
    label: '12개 테마 보기',
    href: '#newsports-themes',
    trackLabel: 'program-monthly-newsports-themes-hero',
  },
  overview: {
    title: '월간 뉴스포츠 메타 테마란',
    body: '매월 하나의 신체 기능·움직임 주제·교구 활용·협동 활동을 중심으로 뉴스포츠 수업을 구성하는 월간형 커리큘럼입니다. 한 달 동안 같은 메타 테마 안에서 활동을 반복·확장하며, 아이들이 새로운 스포츠 경험과 협동 움직임을 자연스럽게 쌓도록 설계합니다.',
    emphasis: '행사형 원데이가 아니라, 월 4회 기준으로 이어지는 정규·방과후 수업 흐름입니다.',
  },
  themesSection: {
    eyebrow: '12 THEMES',
    title: '대표 프로그램',
    lead: '현장 운영성, 아이들의 몰입도, 안전성, 기관 제안 적합도를 기준으로 우선순위를 정리했습니다.',
    sectionId: 'newsports-themes',
  },
  programPoints: {
    title: '운영 특징',
    items: [
      {
        title: '수준별 운영',
        description: '같은 프로그램도 연령과 운동 경험에 따라 규칙, 거리, 도구, 인원을 조절해 운영합니다.',
      },
      {
        title: '다양한 스포츠 경험',
        description: '줄 활용, 라켓형, 필드형, 타깃형, 침투형, 협동형 활동을 균형 있게 경험합니다.',
      },
      {
        title: '기관 맞춤 구성',
        description: '정규수업, 방과후, 원데이, 캠프, 행사형 체육 프로그램으로 유연하게 구성할 수 있습니다.',
      },
    ],
  },
  target: {
    title: '추천 운영 대상',
    rows: [
      {
        label: '유아 · 초등 저학년',
        value: '플로어컬링, 플레이 로프, 패드민턴, 스포츠스태킹 등 입문형 활동 중심',
      },
      {
        label: '초등 중학년',
        value: '플로어볼, 펀스틱, 티볼, 플라잉디스크, 킨볼 등 도구 조작·팀 활동 중심',
      },
      {
        label: '초등 고학년 · 청소년',
        value: '피클볼, 플래그풋볼, 변형 구기, 플로어볼 등 전술·경기형 활동 중심',
      },
      {
        label: '기관 행사 · 캠프',
        value: '플로어컬링, 펀스틱, 킨볼, 플레이 로프, 변형 구기 등 참여 회전율이 높은 구성 중심',
      },
    ] as const,
  },
  institutionFit: {
    title: '기관 도입',
    lead: '키움·방과후·돌봄 프로그램에 월별 수업안 형태로 바로 적용할 수 있습니다.',
    body: '월 4회 기준 구성을 기본으로 하되, 기관 회차·공간·인원에 맞춰 뉴스포츠 메타 테마와 활동 모듈을 조정합니다. SPOMOVE·PAPS와 병행하거나, 뉴스포츠 중심 월간 수업으로도 운영할 수 있습니다.',
  },
  finalCta: {
    title: '스포키듀 뉴스포츠 프로그램을 기관에 맞춰 제안합니다',
    description:
      '수업 대상, 공간, 인원, 운영 목적에 따라 12개 테마를 조합해 정규수업·방과후·캠프·원데이 프로그램으로 구성할 수 있습니다.',
    label: '월간 뉴스포츠 문의하기',
    href: `${SPOKEDU_BASE_PATH}/contact?type=dispatch`,
    trackLabel: 'program-monthly-newsports-dispatch-final',
  },
  relatedMonthlyHref: `${SPOKEDU_BASE_PATH}/monthly`,
} as const;
