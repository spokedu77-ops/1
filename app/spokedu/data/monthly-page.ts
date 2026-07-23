import type { HomeMediaKey } from './home-media';
import { SPOKEDU_BASE_PATH } from './site';

export const monthlyPage = {
  hero: {
    kicker: '월간형 체육 커리큘럼',
    lines: ['월별 테마로', '수업의 흐름을 설계합니다'] as const,
    subtitle:
      '신체 기능, 움직임 주제, 교구 활용, 협동 활동을 월별 테마로 구성해 기관 정규수업과 방과후 프로그램에 적용할 수 있습니다.',
    mediaKey: 'proofClass' as HomeMediaKey,
    cta: {
      label: '월간 수업 문의하기',
      href: `${SPOKEDU_BASE_PATH}/contact?type=dispatch`,
      trackLabel: 'monthly-hero-inquiry',
    },
  },
  definition: {
    title: '월간 수업이란',
    body: '월간 수업은 매월 하나의 신체 기능, 움직임 주제, 교구 활용, 협동 활동을 중심으로 구성하는 테마형 체육 커리큘럼입니다. 정규수업·방과후·돌봄 프로그램에 월별 흐름으로 적용할 수 있습니다.',
    mediaKey: 'proofCenter' as HomeMediaKey,
  },
  benefits: {
    title: '월간형 수업의 장점',
    items: [
      {
        title: '수업 흐름이 생깁니다',
        description:
          '매월 하나의 주제 안에서 활동을 반복하고 확장하며 아이들의 참여 경험을 쌓습니다.',
      },
      {
        title: '기관 운영이 쉬워집니다',
        description:
          '월별 테마와 활동 방향이 정리되어 정규수업, 방과후, 돌봄 프로그램에 적용하기 쉽습니다.',
      },
      {
        title: '아이들의 변화가 보입니다',
        description:
          '같은 주제 안에서 난이도와 활동 방식을 조절하며 움직임 경험을 자연스럽게 확장합니다.',
      },
    ],
  },
  themeExamples: {
    title: '월별 테마 예시',
    lead: '연간 고정 일정이 아닌, 기관 상황에 맞춰 선택·조합하는 예시 테마입니다.',
    items: [
      {
        title: '균형감각',
        description: '한 발 서기, 중심 이동, 코어 안정성을 경험합니다.',
      },
      {
        title: '민첩성',
        description: '방향 전환, 빠른 반응, 짧은 이동 미션을 진행합니다.',
      },
      {
        title: '협동 움직임',
        description: '친구와 함께 목표를 수행하고 팀 활동을 경험합니다.',
      },
      {
        title: '리듬·타이밍',
        description: '음악, 신호, 박자에 맞춰 움직이는 활동을 구성합니다.',
      },
      {
        title: '뉴스포츠',
        description: '안전한 교구를 활용해 새로운 스포츠 경험을 확장합니다.',
      },
      {
        title: '체력 요소',
        description: '달리기, 점프, 버티기, 균형 활동으로 기초 체력을 경험합니다.',
      },
    ],
  },
  operations: {
    title: '운영 방식',
    items: [
      {
        title: '운영 주기',
        description: '월 4회 기준으로 구성하거나 기관 일정에 맞춰 회차를 조정합니다.',
      },
      {
        title: '운영 대상',
        description: '유아 후반부터 초등학생까지 연령과 참여 수준에 맞춰 난이도를 조절합니다.',
      },
      {
        title: '운영 공간',
        description: '강당, 활동실, 교실, 야외 공간 등 기관 환경에 맞춰 활동을 구성합니다.',
      },
      {
        title: '운영 구성',
        description: '월별 테마, 주요 활동, 변형 방법, 안전 기준을 함께 정리해 운영합니다.',
      },
    ],
  },
  roleCompare: {
    title: '월간 수업과 커리큘럼 콘텐츠의 차이',
    monthlyLead:
      '기관 현장에서 매월 운영할 수 있는 월별 수업 흐름 — 테마, 활동, 회차 운영을 중심으로 제안합니다.',
    curriculumLead:
      '수업안, 매뉴얼, 강사교육, 라이선싱 등 콘텐츠 자산화 — 현장 운영을 자료·교육 체계로 확장합니다.',
    curriculumHref: `${SPOKEDU_BASE_PATH}/curriculum`,
    curriculumLinkLabel: '커리큘럼 콘텐츠 보기',
  },
  cta: {
    title: '우리 기관에도 월간형 체육수업을 운영하고 싶다면',
    description:
      '대상 연령, 운영 주기, 공간, 수업 목적을 확인한 뒤 월별 테마 흐름을 제안합니다. 프로그램이 정해지지 않았어도 상담으로 이어드립니다.',
    label: '기관 운영 상담',
    href: `${SPOKEDU_BASE_PATH}/contact?type=dispatch`,
    trackLabel: 'monthly-dispatch-cta',
    mediaKey: 'trackDispatch' as HomeMediaKey,
  },
} as const;
