import type { HomeMediaKey } from './home-media';
import { SPOKEDU_BASE_PATH } from './site';

export const dispatchPage = {
  hero: {
    lines: ['기관의 공간과 인원에 맞춰', '체육교육 프로그램을', '제안합니다'] as const,
    subtitle:
      '키움센터·학교·복지기관 현장에 정규수업·원데이·방학캠프를 운영 가능한 프로그램으로 설계하고, 제안서까지 이어드립니다.',
    mediaKey: 'trackDispatch' as HomeMediaKey,
  },
  heroCtas: {
    primary: {
      label: '기관 프로그램 제안받기',
      href: `${SPOKEDU_BASE_PATH}/contact?type=dispatch`,
      trackLabel: 'dispatch-cta-program',
    },
    secondary: {
      label: '맞춤 제안서 요청하기',
      href: `${SPOKEDU_BASE_PATH}/contact?type=dispatch&proposal=true`,
      trackLabel: 'dispatch-cta-proposal',
    },
  },
  whoFits: {
    title: '이런 기관에 적합합니다',
    items: [
      {
        title: '키움·지역아동센터',
        description: '정규 체육 시간과 방학 프로그램을 연간 흐름으로 운영하고 싶을 때.',
      },
      {
        title: '학교·방과후',
        description: '학기·방학 일정에 맞춘 정규수업, 원데이, 캠프를 한 번에 제안받고 싶을 때.',
      },
      {
        title: '복지·공공 기관',
        description: '행사·체험·포용형 수업 등 목적에 맞는 맞춤 구성이 필요할 때.',
      },
    ],
  },
  smallSpace: {
    title: '공간이 작아도 가능한가요?',
    description:
      '활동실·강당·체육관·실내 복도 등 현장 여건을 먼저 파악한 뒤, 인원과 동선에 맞게 프로그램을 재구성합니다. 공간이 달라도 수업 흐름이 무너지지 않도록 설계합니다.',
  },
  operationTypes: {
    title: '운영 가능 형태',
    rows: [
      {
        label: '정규수업',
        description:
          '매주 반복되는 흐름 안에서 아이들의 움직임 습관과 참여 경험을 쌓습니다.',
      },
      {
        label: '원데이 행사',
        description:
          '기관 행사 일정에 맞춰 협동 미션과 체육 활동을 짧고 강하게 구성합니다.',
      },
      {
        label: '방학캠프',
        description:
          '방학 기간 동안 체육과 예체능 활동을 결합해 하루 단위 몰입 경험을 만듭니다.',
      },
    ],
    mediaKey: 'programOneday' as HomeMediaKey,
  },
  signaturePrograms: {
    title: '기관에서 도입하는 대표 프로그램',
    items: [
      {
        name: 'SPOMOVE',
        description:
          '화면 신호에 맞춰 보고·판단·움직이는 에듀테크 체육으로, 수업 참여와 집중을 동시에 끌어옵니다. 연령별 수업안과 교구를 현장에 맞게 투입합니다.',
        href: `${SPOKEDU_BASE_PATH}/programs/spomove`,
        trackLabel: 'dispatch-spomove',
        mediaKey: 'programSpomove' as HomeMediaKey,
      },
      {
        name: 'PAPS',
        description:
          '초등 기초체력 항목을 놀이로 풀어, 체력 향상과 수업 몰입을 함께 잡습니다. 정규·방과후 시간표에 바로 연결하기 좋습니다.',
        href: `${SPOKEDU_BASE_PATH}/programs/paps`,
        trackLabel: 'dispatch-paps',
        mediaKey: 'programPaps' as HomeMediaKey,
      },
    ],
  },
  fit: {
    title: '공간·인원 맞춤',
    items: [
      {
        title: '공간',
        description: '좁은 실내·넓은 체육관 모두 동선과 대기 시간을 줄이도록 설계합니다.',
      },
      {
        title: '인원',
        description: '소그룹부터 대규모까지, 참여율이 떨어지지 않는 역할·팀 구성을 제안합니다.',
      },
      {
        title: '목적',
        description: '정규·행사·체력·포용형 목표에 맞춰 프로그램 조합을 달리합니다.',
      },
    ],
  },
  inquiryFlow: {
    title: '제안서까지 이렇게 이어집니다',
    steps: [
      { label: '문의 접수', detail: '기관명·대상·공간·일정을 받습니다.' },
      { label: '현장 조건 확인', detail: '인원·목적·운영 형태를 정리합니다.' },
      { label: '맞춤 제안', detail: '정규·원데이·캠프·프로그램 조합을 제안합니다.' },
      { label: '제안서·견적', detail: '기관에 맞는 제안서와 회신 일정을 안내합니다.' },
    ] as const,
  },
  examples: {
    title: '실제 운영 사례',
    href: `${SPOKEDU_BASE_PATH}/cases`,
    trackLabel: 'dispatch-cases',
    items: [
      { title: '양천 SPOMOVE', mediaKey: 'proofClass' as HomeMediaKey },
      { title: '동작 리듬챌린지', mediaKey: 'proofCenter' as HomeMediaKey },
      { title: '다사랑 원데이', mediaKey: 'proofCommunity' as HomeMediaKey },
    ],
    institutions: ['키움센터', '지역아동센터', '학교·방과후', '키즈 복합'] as const,
  },
  finalCta: {
    title: '기관 운영에 맞는 제안서를 받아보세요',
    description: '대상·공간·인원·일정만 알려주시면 맞춤 프로그램 제안과 제안서 회신 일정을 안내합니다.',
    mediaKey: 'trackDispatch' as HomeMediaKey,
    primary: {
      label: '기관 프로그램 제안받기',
      href: `${SPOKEDU_BASE_PATH}/contact?type=dispatch`,
      trackLabel: 'dispatch-final-program',
    },
    secondary: {
      label: '맞춤 제안서 요청하기',
      href: `${SPOKEDU_BASE_PATH}/contact?type=dispatch&proposal=true`,
      trackLabel: 'dispatch-final-proposal',
    },
  },
} as const;
