import type { HomeMediaKey } from './home-media';
import { SPOKEDU_BASE_PATH } from './site';

export const dispatchPage = {
  hero: {
    lines: ['기관 조건에 맞춰', '수업·행사·캠프를', '설계합니다'] as const,
    subtitle: '기관 목표와 공간 조건에 맞춰 정규수업·원데이·방학캠프를 운영 가능한 형태로 제안합니다.',
    mediaKey: 'trackDispatch' as HomeMediaKey,
  },
  heroCtas: {
    primary: {
      label: '기관 수업 제안 요청',
      href: `${SPOKEDU_BASE_PATH}/contact?type=dispatch`,
      trackLabel: 'dispatch-cta-program',
    },
    secondary: {
      label: '제안서 요청하기',
      href: `${SPOKEDU_BASE_PATH}/contact?type=dispatch&proposal=true`,
      trackLabel: 'dispatch-cta-proposal',
    },
  },
  operationTypes: {
    title: '운영 가능 형태',
    rows: [
      {
        label: '정규수업',
        note: '매주 반복되는 흐름 안에서 아이들의 움직임 습관과 참여 경험을 누적합니다.',
      },
      {
        label: '원데이 행사',
        note: '기관 행사 일정과 공간 동선에 맞춰 짧은 시간 안에 몰입도 높은 체험을 설계합니다.',
      },
      {
        label: '방학캠프',
        note: '방학 기간에 맞춘 반일·종일 블록 운영으로 돌봄과 신체활동을 함께 구성합니다.',
      },
      {
        label: 'SPOMOVE 도입',
        note: '보고·판단·반응을 한 수업 안에서 경험하게 해 집중과 참여 전환이 빠른 프로그램입니다.',
      },
      {
        label: 'PAPS 도입',
        note: '기초체력 요소를 놀이형 스테이션으로 운영해 평가 부담 없이 체력 경험을 쌓을 수 있습니다.',
      },
    ],
    mediaKey: 'programOneday' as HomeMediaKey,
  },
  fit: {
    title: '기관 운영 조건에 맞춰 설계합니다',
    items: [
      {
        title: '어떤 기관에 적합한가요?',
        description: '키움센터·지역아동센터·학교·복지기관 등 정기 운영이 필요한 기관에 맞춰 커리큘럼을 제안합니다.',
      },
      {
        title: '공간이 작아도 가능한가요?',
        description: '활동실·강당·교실 크기에 맞춰 동선과 회전 방식을 조정해 대기 시간을 줄이고 안전을 확보합니다.',
      },
      {
        title: '인원이 매번 달라도 가능한가요?',
        description: '소그룹부터 대규모까지 인원 변동을 고려해 난이도·조 편성·활동 밀도를 현장형으로 맞춥니다.',
      },
    ],
  },
  examples: {
    title: '현장 사례',
    href: `${SPOKEDU_BASE_PATH}/cases`,
    trackLabel: 'dispatch-cases',
    items: [
      { title: '양천 SPOMOVE', mediaKey: 'proofClass' as HomeMediaKey },
      { title: '동작 리듬챌린지', mediaKey: 'proofCenter' as HomeMediaKey },
      { title: '다사랑 원데이', mediaKey: 'proofCommunity' as HomeMediaKey },
    ],
    institutions: ['키움센터', '지역아동센터', '학교·방과후', '키즈 복합'] as const,
  },
  proposalFlow: {
    title: '제안서 문의까지의 흐름',
    steps: [
      '기관 목적·대상 확인',
      '공간·인원·일정 파악',
      '정규/원데이/캠프 구성안 제안',
      '제안서·견적 전달',
      '파일럿 또는 정식 운영 확정',
    ] as const,
  },
  finalCta: {
    title: '기관 맞춤 제안',
    description: '공간·인원·일정을 알려주시면 운영 가능한 구성안과 제안서를 함께 안내합니다.',
    mediaKey: 'trackDispatch' as HomeMediaKey,
    primary: {
      label: '기관 수업 제안 요청',
      href: `${SPOKEDU_BASE_PATH}/contact?type=dispatch`,
      trackLabel: 'dispatch-final-program',
    },
    secondary: {
      label: '제안서 요청하기',
      href: `${SPOKEDU_BASE_PATH}/contact?type=dispatch&proposal=true`,
      trackLabel: 'dispatch-final-proposal',
    },
  },
} as const;
