import type { HomeMediaKey } from './home-media';
import { SPOKEDU_BASE_PATH } from './site';

export const privatePage = {
  hero: {
    lines: ['운동을 싫어하는 아이도', '자기 속도로 움직임을', '시작할 수 있습니다'] as const,
    subtitle:
      '1:1·소그룹 맞춤 상담 후, 아이 연령·운동 경험에 맞는 수업 형태와 장소를 함께 정합니다.',
    mediaKey: 'trackPrivate' as HomeMediaKey,
  },
  heroCtas: {
    primary: {
      label: '1:1 수업 상담하기',
      href: `${SPOKEDU_BASE_PATH}/contact?type=private&classType=1to1`,
      trackLabel: 'private-cta-1to1',
    },
    secondary: {
      label: '소그룹 수업 상담하기',
      href: `${SPOKEDU_BASE_PATH}/contact?type=private&classType=small-group`,
      trackLabel: 'private-cta-small-group',
    },
  },
  whoNeeds: {
    title: '이런 아이에게 필요합니다',
    items: [
      {
        title: '운동이 낯선 아이',
        description:
          '참여 부담을 줄이고, 작은 성공을 반복해 움직임에 대한 자신감을 키웁니다.',
      },
      {
        title: '자기 페이스가 필요한 아이',
        description:
          '집중 시간이 짧거나 종목이 막막한 아이에게, 속도와 난이도를 맞춘 수업 설계를 합니다.',
      },
      {
        title: '생활으로 이어지는 변화',
        description:
          '줄넘기·자전거·구기 등 목표 종목과 일상 활동에도 쓰는 움직임을 함께 잡습니다.',
      },
    ],
  },
  classCompare: {
    title: '1:1과 소그룹, 이렇게 달라요',
    items: [
      {
        title: '1:1 개인수업',
        description:
          '아이 한 명의 속도·집중·난이도에 맞춰 설계합니다. 처음 시작하거나 특정 종목을 깊게 다룰 때 적합합니다.',
        mediaKey: 'trackPrivate' as HomeMediaKey,
      },
      {
        title: '2~4명 소그룹',
        description:
          '또래와 함께 협동·경쟁 경험을 나누며, 1:1보다 부담을 낮추고 참여 동기를 키웁니다.',
        mediaKey: 'proofCommunity' as HomeMediaKey,
      },
    ],
  },
  classFormat: {
    title: '수업 장소와 방식',
    items: [
      {
        title: '교구·활동 중심',
        description:
          '놀이형 활동과 도구를 활용해, 지시만 듣는 수업이 아니라 몸으로 참여하는 흐름을 만듭니다.',
        mediaKey: 'proofClass' as HomeMediaKey,
      },
    ],
    locations: [
      '스포키듀 LAB',
      '아파트·커뮤니티 근처',
      '익숙한 야외·개방 체육 공간',
      '협의 가능한 장소',
    ] as const,
    locationNote:
      '아이에게 익숙하고 안전이 확보된 공간을 우선합니다. 상담 시 거주 지역과 희망 시간을 함께 조율합니다.',
  },
  consultFlow: {
    title: '상담 흐름',
    steps: [
      { label: '연령·목표', detail: '궁금한 점과 희망 방향을 먼저 듣습니다.' },
      { label: '운동 경험', detail: '현재 수준과 희망 종목을 확인합니다.' },
      { label: '수업 형태', detail: '1:1·소그룹 중 맞는 방식을 제안합니다.' },
      { label: '장소·시간', detail: '가능한 일정과 장소를 조율합니다.' },
      { label: '수업 시작', detail: '맞춤 커리큘럼으로 첫 수업을 진행합니다.' },
    ] as const,
  },
  faq: {
    title: '상담 전에 많이 묻는 질문',
    items: [
      {
        q: '수업은 어디서, 언제 하나요?',
        a: '평일·주말 모두 가능하며, LAB·아파트 단지·근처 공원 등 아이에게 익숙한 장소를 우선합니다. 희망 스케줄에 맞춰 조율합니다.',
      },
      {
        q: '1:1과 소그룹 중 어떻게 고르나요?',
        a: '처음이거나 집중·난이도 맞춤이 중요하면 1:1, 또래와 함께 참여 동기를 키우고 싶다면 소그룹을 권합니다. 상담에서 함께 정합니다.',
      },
      {
        q: '수업 후 피드백이 있나요?',
        a: '회차 종료 후 성취한 부분과 다음 방향을 카카오 채널로 안내해, 학부모가 수업 흐름을 이해하기 쉽게 돕습니다.',
      },
      {
        q: '운동을 싫어하는 아이도 가능한가요?',
        a: '가능합니다. 작은 성공과 놀이형 활동으로 부담을 낮추고, 아이 속도에 맞춰 참여 경험부터 쌓습니다.',
      },
    ] as const,
  },
  finalCta: {
    title: '아이에게 맞는 수업, 지금 상담하세요',
    description: '연령·운동 수준·희망 종목·지역만 알려주시면 1:1·소그룹 방향을 안내드립니다.',
    mediaKey: 'trackPrivate' as HomeMediaKey,
    primary: {
      label: '1:1 수업 상담하기',
      href: `${SPOKEDU_BASE_PATH}/contact?type=private&classType=1to1`,
      trackLabel: 'private-final-1to1',
    },
    secondary: {
      label: '소그룹 수업 상담하기',
      href: `${SPOKEDU_BASE_PATH}/contact?type=private&classType=small-group`,
      trackLabel: 'private-final-small-group',
    },
  },
} as const;
