import type { HomeMediaKey } from './home-media';

export type PrivateLocationItem = {
  title: string;
  description: string;
};

export type PrivateInstructor = {
  photo: string;
  name: string;
  degree: string;
  badges: readonly string[];
};

export type PrivateCurriculumItem = {
  img: string;
  alt: string;
  title: string;
  description: string;
};

export type PrivateClassFlowImage = {
  src: string;
  alt: string;
  large?: boolean;
};

export type PrivateClassFlowStep = {
  num: string;
  title: string;
  description: string;
};

export type PrivateReview = {
  text: string;
  who: string;
  course: string;
};

/** 실시간 카운팅 시뮬레이션 — 근거 검증 전까지 랜딩에서는 미사용 */
export const PRIVATE_COUNTER_BASE_DATE = '2024-01-01';
export const PRIVATE_COUNTER_BASE_STUDENTS = 1200;
export const PRIVATE_COUNTER_BASE_SESSIONS = 8500;
export const PRIVATE_COUNTER_DAILY_STUDENTS = 3;
export const PRIVATE_COUNTER_DAILY_SESSIONS = 5;

export const privatePage = {
  hero: {
    kicker: '학부모 · 개인수업',
    trustBadge: '연세대 체육교육학과 출신 운영진',
    lines: ['즐거운 신체활동으로', '평생체육의 경험을 선물합니다'] as const,
    subtitle:
      '아이의 운동 경험, 수업 목표, 가능한 장소를 함께 확인하고 1:1·소그룹 수업 방향을 안내드립니다.',
    mediaKey: 'trackPrivate' as HomeMediaKey,
  },
  trustMetrics: {
    eyebrow: '운영 방식',
    items: [
      { id: 'format', value: '1:1·소그룹', label: '아이 속도에 맞춘 수업 형태' },
      { id: 'visit', value: '방문형', label: '집·공원·체육시설 상담 후 운영' },
      { id: 'feedback', value: '회차 피드백', label: '수업 후 성장 포인트 전달' },
    ],
  },
  heroCtas: {
    primary: {
      label: '개인수업 상담',
      href: '#apply',
      trackLabel: 'private-cta-consult',
    },
    secondary: {
      label: '수업 현장 보기',
      href: '#class-flow',
      trackLabel: 'private-cta-class-flow',
    },
  },
  whoNeeds: {
    eyebrow: '대상',
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
  instructors: {
    eyebrow: '운영진',
    title: '검증된 체육교육 전문가 운영진',
    items: [
      {
        photo: '/images/spokedu/private/instructor-choi.jpg',
        name: '총괄팀장 최지훈',
        degree: '연세대학교 체육교육학 학사',
        badges: ['지도 경력 10년 차', '교원자격증', '시스템 구축 및 강사 교육'],
      },
      {
        photo: '/images/spokedu/private/instructor-kim-yunki.jpg',
        name: '운영팀장 김윤기',
        degree: '연세대학교 체육교육학 학사',
        badges: ['지도 경력 8년 차', '교원자격증', '강사 관리 및 프로그램 기획'],
      },
      {
        photo: '/images/spokedu/private/instructor-kim-gumin.jpg',
        name: '수업팀장 김구민',
        degree: '강원대학교 체육교육학 학사',
        badges: ['지도 경력 5년 차', '생활체육 지도자 자격증', '프로그램 개발 및 수업 총괄'],
      },
    ] satisfies PrivateInstructor[],
  },
  classCompare: {
    eyebrow: '수업 형태',
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
        mediaKey: 'trackSmallGroup' as HomeMediaKey,
      },
    ],
  },
  curriculumPrograms: {
    eyebrow: '종목별 커리큘럼 가이드',
    title: '목표 종목에 맞춰 설계하는 수업 방향',
    lead: '줄넘기·구기·유아체육 등 목표 종목에 맞춰 수업 방향을 제안합니다. 연령과 기초 체력을 함께 보고 맞는 구성을 안내합니다.',
    items: [
      {
        img: '/images/spokedu/private/curriculum-jumprope.jpg',
        alt: '줄넘기',
        title: '줄넘기',
        description: '리듬감 및 전신 협응력 강화',
      },
      {
        img: '/images/spokedu/private/curriculum-running.jpg',
        alt: '육상',
        title: '육상(달리기)',
        description: '바른 자세 교정과 반응 속도 향상',
      },
      {
        img: '/images/spokedu/private/curriculum-bike.jpg',
        alt: '자전거',
        title: '자전거',
        description: '균형 감각 및 두려움 극복',
      },
      {
        img: '/images/spokedu/private/curriculum-inline.jpg',
        alt: '인라인',
        title: '인라인',
        description: '안전한 라이딩과 중심 이동 훈련',
      },
      {
        img: '/images/spokedu/private/curriculum-preschool.jpg',
        alt: '유아체육',
        title: '유아체육',
        description: '놀이 기반 기초 운동 발달',
      },
      {
        img: '/images/spokedu/private/curriculum-soccer.jpg',
        alt: '축구',
        title: '축구',
        description: '민첩성, 팀워크, 기초 구기 능력 향상',
      },
      {
        img: '/images/spokedu/private/curriculum-basketball.jpg',
        alt: '농구',
        title: '농구',
        description: '드리블과 공간 인지 능력 강화',
      },
      {
        img: '/images/spokedu/private/curriculum-paps.jpg',
        alt: '팝스',
        title: '팝스',
        description: '팝스 수행평가 대비 및 체력향상',
      },
    ] satisfies PrivateCurriculumItem[],
  },
  classFlow: {
    eyebrow: '수업 구조',
    title: '스포키듀 수업 스케치',
    lead: '아이의 자발적인 참여를 이끌어내는 체계적인 3단계 수업 구조입니다.',
    steps: [
      {
        num: '01',
        title: '라포 형성 및 신체기능 향상 세션',
        description:
          '강사와의 유대감을 형성하고, 그날 진행할 메인 세션에 필요한 신체 기능 향상 프로그램을 진행합니다.',
      },
      {
        num: '02',
        title: '메인 활동',
        description:
          '아동별 발달 특성과 운동 수행 수준에 따라 다양한 종목을 맞춤형으로 구성하고 기술 습득과 신체 기능 향상이 함께 이루어지는 체육 수업을 제공합니다.',
      },
      {
        num: '03',
        title: '쿨다운 및 피드백',
        description:
          '신체를 안정시키며 오늘 성취한 부분에 대해 스스로 이야기하게 유도하고, 긍정적인 피드백으로 자존감을 높여 마무리합니다.',
      },
    ] satisfies PrivateClassFlowStep[],
    /** 현장 실사진만 (커리큘럼 가이드 PNG 금지) — 큰 1 + 작은 2 */
    images: [
      {
        src: '/images/spokedu/private/class-flow-01.jpg',
        alt: '스포키듀 수업 스케치 — 메인 활동',
        large: true,
      },
      {
        src: '/images/spokedu/private/class-flow-02.jpg',
        alt: '스포키듀 수업 스케치 — 소그룹 활동',
      },
      {
        src: '/images/spokedu/private/class-flow-03.jpg',
        alt: '스포키듀 수업 스케치 — 현장 지도',
      },
    ] satisfies PrivateClassFlowImage[],
  },
  classFormat: {
    eyebrow: '장소',
    title: '수업 장소와 방식',
    lead: '아이에게 익숙하고 안전한 공간을 우선하며, 수업 형태에 맞게 장소를 함께 정합니다.',
    locations: [
      { title: 'SPOKEDU LAB', description: '정해진 공간에서 안정적으로 수업을 진행합니다.' },
      { title: '아파트 커뮤니티', description: '입주민 공간, 실내 체육 공간 등 환경에 맞춰 수업을 구성합니다.' },
      { title: '공원·개방 체육 공간', description: '날씨와 안전 동선을 확인한 뒤 야외 움직임 수업으로 운영합니다.' },
      { title: '기타 협의 가능한 공간', description: '거주 지역과 일정을 상담한 뒤, 함께 운영 가능한 장소를 조율합니다.' },
    ] satisfies PrivateLocationItem[],
  },
  sessionCycles: {
    eyebrow: '운영 단위',
    title: '수업 사이클',
    lead: '아이의 상황과 목표에 맞춰 원데이·단기·정기 단위로 유연하게 운영합니다.',
    items: [
      { label: '원데이', description: '체험·집중 보완이 필요할 때, 짧은 단위로 시작합니다.' },
      { label: '단기', description: '특정 목표(종목·체력 등)에 맞춘 집중 코스로 운영합니다.' },
      {
        label: '정기 (8회차)',
        description:
          '꾸준한 습관 형성을 위해 정기 단위로 이어갑니다. 정기 수업은 최대 2회까지 연기가 가능합니다.',
      },
    ],
  },
  reviews: {
    eyebrow: '후기',
    title: '학부모 후기',
    lead: '스포키듀의 체계적인 교육 시스템을 먼저 경험하신 학부모님들의 솔직한 피드백입니다.',
    items: [
      {
        text: '동네 학원에내면 아이가 뒤처질까 봐 걱정이었는데, 1:1로 아이 성향에 완벽하게 맞춰서 지도해주시니 아이가 매주 체육 시간만 기다려요.',
        who: '초등 2학년 학부모',
        course: '기초체력 및 달리기 코스',
      },
      {
        text: '공을 받는 것도 무서워하고 몸을 자꾸 피했는데, 강사님이 던지기보다 보는 법, 기다리는 법, 받는 자세부터 차근차근 잡아주셨어요. 지금은 스스로 먼저 공놀이하자고 말할 만큼 자신감이 생겼습니다.',
        who: '7세 학부모',
        course: '기초 구기 자신감 코스',
      },
      {
        text: 'PAPS 준비를 막연하게만 생각했는데, 아이 수준에 맞춰 차근차근 지도해주셔서 부담 없이 시작할 수 있었어요. 수업 후에는 아이도 체육에 대한 자신감이 조금씩 생기고, 기록도 전보다 좋아지는 게 보여 만족스러웠습니다.',
        who: '초등 5학년 학부모',
        course: 'PAPS 대비 체력 향상 코스',
      },
    ] satisfies PrivateReview[],
  },
  processOnePager: {
    eyebrow: '상담 한 장',
    title: '문의부터 첫 수업까지, 한 장으로 정리',
    lead: '아이 상황만 알려주시면, 맞는 수업 형태·장소·일정을 함께 맞춰 드립니다.',
    flow: [
      { label: '문의', detail: '웹 폼·카카오로 아이 연령·목표를 접수합니다.' },
      { label: '상담·조율', detail: '1:1·소그룹, 장소·가능 시간을 함께 정합니다.' },
      { label: '첫 수업', detail: '아이 반응을 보고 난이도와 흐름을 맞춥니다.' },
      { label: '피드백', detail: '회차 후 피드백으로 다음 방향을 다시 조율합니다.' },
    ] as const,
    checklist: {
      title: '상담 전에 알려주시면 빠른 안내',
      items: [
        '아이 연령·운동 경험',
        '수업 목표 (자신감·체력·종목 등)',
        '희망 지역·시간대',
        '1:1 / 소그룹 선호',
      ] as const,
    },
    formats: {
      title: '가능한 수업 단위',
      items: ['원데이', '단기', '정기 (8회차)'] as const,
    },
    cta: {
      label: '개인수업 상담',
      href: '#apply',
    },
  },
  consultFlow: {
    eyebrow: '상담',
    title: '상담은 이렇게 진행돼요',
    steps: [
      { label: '운동 경험 확인', detail: '아이의 운동 경험과 지금 관심 있는 활동을 함께 이야기합니다.' },
      { label: '수업 형태 정하기', detail: '1:1·소그룹 중 아이에게 맞는 방향을 함께 정합니다.' },
      { label: '장소·일정 조율', detail: '가능한 장소와 시간을 편하게 맞춥니다.' },
      { label: '첫 수업 후 점검', detail: '첫 수업 후 흐름을 보고, 다음 방향을 다시 맞춥니다.' },
    ] as const,
  },
  faq: {
    eyebrow: 'FAQ',
    title: '상담 전에 많이 묻는 질문',
    items: [
      {
        q: '운동을 싫어하는 아이도 가능할까요?',
        a: '가능합니다. 아이의 속도에 맞춰 작은 참여부터 이어가며, 움직임 경험과 자신감을 함께 쌓아갑니다.',
      },
      {
        q: '수업 가능한 시간대는 어떻게 되나요?',
        a: '평일 및 주말(토, 일) 모두 수업 가능합니다. 희망하시는 스케줄에 맞춰 최대한 조율해드립니다.',
      },
      {
        q: '선생님 배정은 어떻게 되나요? 여자 선생님도 계실까요?',
        a: '수업 가능한 종목, 위치, 학생 희망 스케줄에 맞춰 배정됩니다. 여자 선생님 희망 시에도 배정 가능합니다.',
      },
      {
        q: '비가 오거나 일정이 바뀌면 어떻게 하나요?',
        a: '날씨와 안전을 먼저 확인하고, 실내·대체 일정으로 조율합니다. 기상 악화 시 휴강 또는 보강 일정을 조율해드립니다.',
      },
      {
        q: '수업 후 피드백을 받을 수 있나요?',
        a: '매 회차 종료 후 익일 오전까지 아이가 성취한 부분과 앞으로의 방향성에 대한 피드백을 카카오 채널을 통해 전달해 드립니다.',
      },
    ] as const,
  },
  finalCta: {
    title: '아이에게 맞는 시작점을 함께 찾아볼까요?',
    description:
      '운동 경험, 수업 형태, 가능한 장소를 확인한 뒤 아이에게 맞는 방향으로 안내드립니다.',
    mediaKey: 'trackPrivate' as HomeMediaKey,
    primary: {
      label: '개인수업 상담',
      href: '#apply',
      trackLabel: 'private-final-consult',
    },
  },
} as const;
