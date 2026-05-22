import type { HomeMediaKey } from './home-media';
import { SPOKEDU_BASE_PATH } from './site';

export type PrivateLocationItem = {
  title: string;
  description: string;
};

export const privatePage = {
  hero: {
    lines: ['운동을 어려워하는 아이도', '자기 속도로', '시작할 수 있습니다'] as const,
    subtitle:
      '아이의 운동 경험, 수업 목표, 가능한 장소를 함께 확인하고 1:1·소그룹 수업 방향을 안내드립니다.',
    mediaKey: 'trackPrivate' as HomeMediaKey,
  },
  heroCtas: {
    primary: {
      label: '개인수업 상담하기',
      href: `${SPOKEDU_BASE_PATH}/contact?type=private`,
      trackLabel: 'private-cta-consult',
    },
  },
  whoNeeds: {
    title: '어떤 아이에게 맞을까요',
    items: [
      {
        title: '운동에 자신감을 쌓고 싶은 아이',
        description:
          '작은 움직임부터 참여 경험을 넓히며, 운동에 대한 부담을 낮추고 자신감을 키웁니다.',
      },
      {
        title: '활동 중 집중을 이어가는 경험이 필요한 아이',
        description:
          '아이의 속도에 맞춰 짧은 참여부터 이어가며, 몸으로 반응하는 경험을 차근차근 쌓습니다.',
      },
      {
        title: '또래와 함께 움직이는 경험을 넓히고 싶은 아이',
        description:
          '소그룹 안에서 규칙과 협동을 자연스럽게 경험하며, 함께 움직이는 즐거움을 키웁니다.',
      },
      {
        title: '특정 종목 전 기초 움직임을 만들고 싶은 아이',
        description:
          '줄넘기·자전거·구기 등 목표 활동 전, 기초 신체 기능과 움직임 습관을 함께 잡습니다.',
      },
    ],
  },
  classCompare: {
    title: '1:1과 소그룹, 이렇게 선택해요',
    items: [
      {
        title: '1:1 개인수업',
        description:
          '아이의 속도에 맞춰 천천히 시작합니다. 개별 목표와 움직임 습관을 세밀하게 확인하며, 운동 부담을 낮추고 참여 경험을 만듭니다.',
        mediaKey: 'trackPrivate' as HomeMediaKey,
      },
      {
        title: '2~4명 소그룹',
        description:
          '또래와 함께 움직이며 참여 경험을 넓힙니다. 규칙·순서·협동을 자연스럽게 경험하는, 즐겁게 이어지는 흐름입니다.',
        mediaKey: 'proofCommunity' as HomeMediaKey,
      },
    ],
  },
  classFormat: {
    title: '수업 장소와 방식',
    lead: '아이에게 익숙하고 안전한 공간을 우선하며, 수업 형태에 맞게 장소를 함께 정합니다.',
    locations: [
      {
        title: 'SPOKEDU LAB',
        description: '정해진 공간에서 안정적으로 수업을 진행합니다.',
      },
      {
        title: '아파트 커뮤니티',
        description: '입주민 공간, 실내 체육 공간 등 환경에 맞춰 수업을 구성합니다.',
      },
      {
        title: '공원·개방 체육 공간',
        description: '날씨와 안전 동선을 확인한 뒤 야외 움직임 수업으로 운영합니다.',
      },
      {
        title: '기타 협의 가능한 공간',
        description: '거주 지역과 일정을 상담한 뒤, 함께 운영 가능한 장소를 조율합니다.',
      },
    ] satisfies PrivateLocationItem[],
    mediaKey: 'trackPrivate' as HomeMediaKey,
  },
  consultFlow: {
    title: '상담은 이렇게 진행돼요',
    steps: [
      { label: '운동 경험 확인', detail: '아이의 운동 경험과 지금 관심 있는 활동을 함께 이야기합니다.' },
      { label: '수업 형태 정하기', detail: '1:1·소그룹 중 아이에게 맞는 방향을 함께 정합니다.' },
      { label: '장소·일정 조율', detail: '가능한 장소와 시간을 편하게 맞춥니다.' },
      { label: '첫 수업 후 점검', detail: '첫 수업 후 흐름을 보고, 다음 방향을 다시 맞춥니다.' },
    ] as const,
  },
  faq: {
    title: '상담 전에 많이 묻는 질문',
    items: [
      {
        q: '운동을 싫어하는 아이도 가능할까요?',
        a: '가능합니다. 아이의 속도에 맞춰 작은 참여부터 이어가며, 움직임 경험과 자신감을 함께 쌓아갑니다.',
      },
      {
        q: '1:1과 소그룹 중 무엇이 좋을까요?',
        a: '처음이거나 아이만의 속도가 중요하면 1:1, 또래와 함께하는 경험을 넓히고 싶다면 소그룹이 잘 맞습니다. 상담에서 함께 정해요.',
      },
      {
        q: '수업 장소는 어떻게 정하나요?',
        a: 'LAB, 아파트 커뮤니티, 공원·개방 체육 공간 등 아이에게 익숙한 곳을 우선합니다. 거주 지역과 일정을 보고 함께 정합니다.',
      },
      {
        q: '비가 오거나 일정이 바뀌면 어떻게 하나요?',
        a: '날씨와 안전을 먼저 확인하고, 실내·대체 일정으로 조율합니다. 변경이 필요하면 미리 연락드려 부담 없이 맞춥니다.',
      },
      {
        q: '수업 후 피드백을 받을 수 있나요?',
        a: '회차 후 오늘의 참여와 다음에 이어갈 방향을 짧게 안내드립니다. 학부모가 수업 흐름을 이해하기 쉽게 전달합니다.',
      },
    ] as const,
  },
  finalCta: {
    title: '아이에게 맞는 시작점을 함께 찾아볼까요?',
    description:
      '운동 경험, 수업 형태, 가능한 장소를 확인한 뒤 아이에게 맞는 방향으로 안내드립니다.',
    mediaKey: 'trackPrivate' as HomeMediaKey,
    primary: {
      label: '개인수업 상담하기',
      href: `${SPOKEDU_BASE_PATH}/contact?type=private`,
      trackLabel: 'private-final-consult',
    },
  },
} as const;
