import type { HomeMediaKey } from './home-media';
import { SPOKEDU_BASE_PATH } from './site';

export const onedayEventProgramPage = {
  hero: {
    kicker: '기관 행사 · 체험일 · 특별활동',
    lines: ['기관 행사에 맞춰', '협동 미션형', '체육 이벤트를 운영합니다'] as const,
    subtitle:
      '기관 행사, 체험일, 특별활동 일정에 맞춰 아이들이 함께 움직이고 협동하며 참여할 수 있는 체육 이벤트 프로그램을 구성합니다.',
    mediaKey: 'programOneday' as HomeMediaKey,
  },
  heroCta: {
    label: '원데이 이벤트 문의하기',
    href: `${SPOKEDU_BASE_PATH}/contact?type=dispatch`,
    trackLabel: 'program-oneday-dispatch-hero',
  },
  overview: {
    title: '원데이 이벤트란',
    body: '기관 행사, 체험일, 특별활동 일정에 맞춰 아이들이 짧은 시간 안에 함께 움직이고 협동하며 참여할 수 있도록 구성하는 체육 이벤트 프로그램입니다. 정규수업 하루 분량이 아니라, 행사 목적에 맞춘 몰입형 체육 이벤트입니다.',
  },
  situations: {
    title: '어떤 상황에 필요한가요',
    items: [
      {
        title: '기관 특별활동',
        description:
          '정기 수업이 아닌 특별 일정에 맞춰 아이들이 함께 움직이는 체험형 체육활동을 운영합니다.',
      },
      {
        title: '행사·체험일',
        description:
          '센터 행사, 오픈데이, 가족 행사, 시즌 이벤트에 맞춰 짧고 임팩트 있는 활동을 구성합니다.',
      },
      {
        title: '방문형 체육 이벤트',
        description: '기관 공간으로 찾아가 인원과 장소에 맞는 체육 미션을 진행합니다.',
      },
      {
        title: '협동 미션 프로그램',
        description: '아이들이 팀을 이루어 움직이고, 도전하고, 함께 성공하는 경험을 만듭니다.',
      },
    ],
  },
  activities: {
    title: '활동 구성',
    items: [
      {
        title: '협동 미션',
        description: '팀이 함께 목표를 수행하며 소통과 협력을 경험합니다.',
        mediaKey: 'proofCommunity' as HomeMediaKey,
      },
      {
        title: '뉴스포츠 체험',
        description: '펀스틱, 플로어볼, 킨볼 등 안전한 교구를 활용해 새로운 스포츠를 경험합니다.',
        mediaKey: 'programOneday' as HomeMediaKey,
      },
      {
        title: '릴레이 챌린지',
        description: '달리기, 이동, 균형, 반응 활동을 조합해 짧고 몰입감 있는 도전을 진행합니다.',
        mediaKey: 'proofEvent' as HomeMediaKey,
      },
      {
        title: 'SPOMOVE 이벤트',
        description: '빔 기반 반응형 활동을 활용해 화면 신호에 맞춰 움직이는 체험을 구성합니다.',
        mediaKey: 'programSpomove' as HomeMediaKey,
      },
    ],
  },
  operations: {
    title: '운영 방식',
    items: [
      {
        title: '운영 시간',
        description: '40분, 60분, 90분 등 기관 일정에 맞춰 구성합니다.',
      },
      {
        title: '운영 인원',
        description: '소그룹부터 단체 인원까지 공간과 안전 동선을 기준으로 조정합니다.',
      },
      {
        title: '운영 공간',
        description: '강당, 활동실, 다목적실, 야외 공간 등 환경에 맞춰 프로그램을 구성합니다.',
      },
      {
        title: '운영 구성',
        description: '협동 미션, 뉴스포츠, SPOMOVE, 릴레이 활동 등을 목적에 맞게 조합합니다.',
      },
    ],
  },
  compare: {
    title: '정규수업과 무엇이 다른가요',
    regular: {
      title: '정규수업',
      description: '매주 반복되는 흐름 안에서 움직임 습관과 참여 경험을 쌓는 수업',
    },
    oneday: {
      title: '원데이 이벤트',
      description: '행사 일정에 맞춰 짧은 시간 안에 협동, 도전, 몰입 경험을 만드는 체육 이벤트',
    },
  },
  audience: {
    title: '대상 · 운영 형태',
    body: '유치원·초등학생 대상 기관에서 행사, 체험일, 특별활동, 시즌 이벤트 형태로 운영할 수 있습니다.',
  },
  cases: {
    title: '실제 운영 예시',
    slugs: ['dasarang-oneday', 'seodaemun-event-booth'] as const,
    recordsHref: `${SPOKEDU_BASE_PATH}/records`,
  },
  finalCta: {
    title: '기관 행사에 맞는 원데이 체육 이벤트가 필요하다면',
    description: '일정, 인원, 공간, 행사 목적을 확인한 뒤 적합한 활동 구성으로 제안드립니다.',
    label: '원데이 이벤트 문의하기',
    href: `${SPOKEDU_BASE_PATH}/contact?type=dispatch`,
    trackLabel: 'program-oneday-dispatch-final',
  },
} as const;
