import type { HomeMediaKey } from './home-media';
import { HOME_PROGRAM_SYSTEM_HREF, SPOKEDU_BASE_PATH } from './site';

export type DispatchExampleItem = {
  venue: string;
  audience: string;
  operation: string;
  activity: string;
  mediaKey: HomeMediaKey;
  href: string;
};

export type DispatchReview = {
  quote: string;
  body: string;
  name: string;
  org: string;
  accent: 'violet' | 'sky' | 'lime';
};

export type DispatchCompareRow = {
  label: string;
  spokedu: string;
  basic: string;
};

export type DispatchLineupItem = {
  id: string;
  image?: string;
  imageAlt?: string;
  audience: string;
  name: string;
  subtitle: string;
  paragraphs: readonly string[];
  tags: readonly string[];
  example: string;
  mediaKey?: HomeMediaKey;
  href?: string;
  trackLabel?: string;
};

export const dispatchPage = {
  hero: {
    kicker: '기관·단체 프로그램',
    lines: ['대상과 현장에 맞는', '체육교육 과정을 설계합니다'] as const,
    subtitle:
      '키움센터·아동시설·학교·복지관에 맞춘 맞춤 프로그램. 공간·인원·목표에 따라 정규·원데이·방학 운영과 SPOMOVE를 제안합니다.',
    mediaKey: 'trackDispatch' as HomeMediaKey,
  },
  heroCtas: {
    primary: {
      label: '기관 프로그램 제안받기',
      href: `${SPOKEDU_BASE_PATH}/contact?type=dispatch`,
      trackLabel: 'dispatch-cta-program',
    },
    secondary: {
      label: '프로그램 라인업 보기',
      href: HOME_PROGRAM_SYSTEM_HREF,
      trackLabel: 'dispatch-cta-programs',
    },
  },
  trustMetrics: {
    eyebrow: '운영 지표',
    items: [
      { value: '500개 +', label: '누적 파견 기관' },
      { value: '98%', label: '기관 재계약률' },
      { value: '맞춤형', label: '공간·인원 맞춤 수업 설계' },
    ] as const,
  },
  partnerReviews: {
    eyebrow: '기관 후기',
    title: '기관 담당자가 직접 말하는 도입 효과',
    items: [
      {
        quote: '느린 학습자도 소외되지 않는 진짜 교육',
        body: '특수 아동이 함께 있는 통합반이라 외부 체육 강사를 쓰는 데 조심스러운 부분이 있었습니다. 하지만 스포키듀는 느린 학습자까지 고려한 난이도 조절과 참여 방식 설계를 통해, 모든 아이들이 각자의 수준에서 성취감을 느끼며 수업에 참여할 수 있도록 운영해주고 있습니다.',
        name: '박○○ 센터장님',
        org: '지역 복지관 아동 발달센터',
        accent: 'violet',
      },
      {
        quote: '재미에만 머무르지 않고, 성장의 흐름이 보이는 수업입니다.',
        body: '놀이체육이라고 해서 단순한 활동 중심 수업일 줄 알았는데, 스포키듀는 연간 커리큘럼 안에서 신체 기능 향상 목표를 체계적으로 반영해 운영해주셔서 훨씬 전문적으로 느껴졌습니다. 아이들도 즐겁게 참여하고, 기관 입장에서도 교육적 방향성이 분명해 만족도가 높았습니다.',
        name: '김○○ 담당자님',
        org: '거점형 키움센터 담당자',
        accent: 'sky',
      },
      {
        quote: '공간과 인원에 꼭 맞게 수업을 정말 잘 맞춰주셨습니다.',
        body: '장소가 넓지 않고 참여 인원도 매번 달라 운영이 쉽지 않았는데, 스포키듀는 현장 여건을 빠르게 파악한 뒤 그에 맞는 프로그램으로 자연스럽게 구성해주셨습니다. 공간이 달라도, 인원이 달라도 수업의 흐름이 무너지지 않도록 유연하게 운영해주셔서 매우 만족스러웠습니다.',
        name: '이○○ 담당자님',
        org: 'OO구 보건소 담당자',
        accent: 'lime',
      },
    ] satisfies DispatchReview[],
  },
  comparison: {
    id: 'comparison',
    eyebrow: '차별성',
    title: '일반 프리랜서, 다른 업체와 스포키듀가 다른 이유',
    lead: '기관 운영자가 현장에서 체감하는 기준으로 비교했습니다. 운영 안정성과 수업 설계 품질을 함께 확인해 보세요.',
    rows: [
      {
        label: '핵심 커리큘럼',
        spokedu: '연세대학교 체육전공자들의 전문성과 실제 현장 데이터가 적용된 연간 커리큘럼',
        basic: '강사 개인의 경험 및 재량에 의존',
      },
      {
        label: '강사 파견 기준',
        spokedu: '체육 전공자 출신으로 스포키듀 교육과정을 이수한 전문 강사',
        basic: '검증 이력 없는 단기 프리랜서 혼용',
      },
      {
        label: '결근·펑크 리스크',
        spokedu: '부재 시 즉시 공유 후 운영진 투입으로 공백 최소화',
        basic: '대부분 수업 진행 불가 및 휴강 처리',
      },
      {
        label: '수업 진행 방식',
        spokedu: '아이의 반응과 움직임을 설계하면서 몰입과 성장의 흐름을 만드는 프로그램',
        basic: '단순 기구 놀이 및 시간 채우기식 체육',
      },
      {
        label: '기관 제공 데이터',
        spokedu: '참여도 및 신체 성장 지표를 분석한 월간 리포트 발송',
        basic: '전무함 (구두 전달 수준)',
      },
    ] satisfies DispatchCompareRow[],
  },
  whoFits: {
    eyebrow: '대상 기관',
    title: '이런 기관에 적합합니다',
    items: [
      {
        title: '키움센터·지역아동센터',
        description: '정기 돌봄 흐름 안에서 아이들이 꾸준히 움직일 수 있는 체육수업을 운영합니다.',
      },
      {
        title: '학교·방과후',
        description: '학년과 인원에 맞춰 기초체력, 협동활동, 뉴스포츠 수업을 구성합니다.',
      },
      {
        title: '복지관·공공기관',
        description: '대상 특성과 공간 조건을 고려해 안전한 신체활동 프로그램을 제안합니다.',
      },
      {
        title: '유치원·어린이집',
        description: '연령에 맞는 기초 움직임과 놀이형 체육으로 짧은 시간 안에 참여 경험을 만듭니다.',
      },
      {
        title: '아동 대상 문화공간',
        description: '행사·체험 일정에 맞춰 원데이 프로그램과 집중형 체육 활동을 구성합니다.',
      },
    ],
  },
  smallSpace: {
    eyebrow: '공간',
    title: '공간이 작아도 가능한가요?',
    lead: '강당이 아니어도 가능합니다.',
    description:
      '교실, 다목적실, 센터 활동실처럼 제한된 공간에서도 인원, 동선, 소음, 안전 범위를 확인해 수업을 구성합니다.',
    criteria: [
      '인원 규모에 맞는 활동 면적과 대기 동선',
      '소음·이웃 이용을 고려한 활동 선택',
      '바닥·기구·이동 경로의 안전 범위 점검',
    ] as const,
  },
  coreCurriculum: {
    eyebrow: '베이스 프로그램',
    title: '펑셔널 무브 · 팀빌딩',
    paragraphs: [
      '스포키듀의 핵심 커리큘럼은 펑셔널 무브와 팀빌딩을 베이스 프로그램으로 운영됩니다.',
      '펑셔널 무브를 통해 협응력, 균형감각, 민첩성, 순발력 등 기초 신체 기능을 체계적으로 향상시킵니다.',
      '팀빌딩 활동을 통해 팀 내 협동과 팀 간 건강한 경쟁 경험을 함께 설계합니다.',
    ] as const,
  },
  programLineup: {
    eyebrow: '파견 라인업',
    title: '기관 목적에 맞춘 타겟 최적화 파견',
    lead: '대상 연령과 기관 특성에 맞춰 다양한 교구와 커리큘럼이 현장으로 직접 투입됩니다.',
    items: [
      {
        id: 'spomove',
        image: '/images/spokedu/programs/program-spomove.jpg',
        imageAlt: '스포무브 시지각 브레인 놀이체육',
        audience: '초중고 방과후 · 지역아동센터 · 기관 클래스',
        name: '스포무브',
        subtitle: '시지각 브레인 놀이체육',
        paragraphs: [
          '화면의 시각 정보를 보고 판단한 뒤 몸으로 반응하는 에듀테크형 놀이체육입니다. 보고–생각하고–움직이는 과정을 반복하며 시지각, 주의집중, 판단력, 협응을 함께 자극합니다.',
          '놀이처럼 즐겁게 참여하면서도 두뇌 인지와 신체 움직임이 연결되는 통합형 신체활동을 경험할 수 있도록 구성합니다.',
        ],
        tags: ['몰입형 웜업', '연령별 커리큘럼', '교구 직접 지참'],
        example: '예시: 반응 인지, 이중 과제 등',
        href: `${SPOKEDU_BASE_PATH}/programs/spomove`,
        trackLabel: 'dispatch-lineup-spomove',
        mediaKey: 'programSpomove' as HomeMediaKey,
      },
      {
        id: 'monthly-sports',
        image: '/images/spokedu/programs/program-monthly-newsports.png',
        imageAlt: '월간 스포츠 매달 바뀌는 종목·뉴스포츠 체험',
        audience: '초중고 방과후 · 지역아동센터 · 기관 클래스',
        name: '월간 스포츠',
        subtitle: '매달 바뀌는 종목·뉴스포츠 체험',
        paragraphs: [
          '매달 새로운 스포츠와 뉴스포츠를 경험하며 다양한 움직임과 규칙을 익히는 월간 클래스입니다. 한 종목에 머무르지 않고 월별로 구성을 바꿔 흥미와 참여를 지속적으로 이끌어냅니다.',
          '종목 경험에 그치지 않고 협동, 사회성, 상황 판단이 함께 이루어질 수 있도록 팀 활동과 규칙 이해를 균형 있게 반영합니다.',
        ],
        tags: ['월별 순환 구성', '뉴스포츠 체험', '협동·판단 강화'],
        example: '예시: 플로어볼, 플래그풋볼 등',
        href: `${SPOKEDU_BASE_PATH}/monthly`,
        trackLabel: 'dispatch-lineup-monthly',
        mediaKey: 'programOneday' as HomeMediaKey,
      },
      {
        id: 'slow-sports',
        image: '/images/spokedu/dispatch/dispatch-institution-class.jpg',
        imageAlt: '슬로우 스포츠 속도에 맞춘 포용형 체육',
        audience: '발달센터 · 복지관 · 특수학급 · 포용형 클래스',
        name: '슬로우 스포츠',
        subtitle: '속도에 맞춘 포용형 체육',
        paragraphs: [
          '느린 학습자와 특수 체육 대상을 포함해 각자의 속도에 맞춰 참여할 수 있도록 설계한 포용형 체육 클래스입니다. 빠른 수행보다 안정적인 참여와 반복 경험에 초점을 두고 수업을 진행합니다.',
          '무리한 경쟁보다 활동의 즐거움과 성공 경험을 느낄 수 있도록 난이도와 과제를 단계적으로 구성합니다.',
        ],
        tags: ['개별 속도 반영', '반복 중심 활동', '성공 경험 설계'],
        example: '예시: 단계별 이동운동, 규칙 단순화 게임 등',
        mediaKey: 'proofCenter' as HomeMediaKey,
      },
      {
        id: 'mini-olympics',
        image: '/images/spokedu/programs/program-camp.jpg',
        imageAlt: '미니 올림픽 팀 활동 스페셜 클래스',
        audience: '유치원 · 학교 · 복지관 · 기관 클래스',
        name: '미니 올림픽',
        subtitle: '협동과 참여로 완성하는 스포츠 스페셜 클래스',
        paragraphs: [
          '다양한 스포츠 요소를 쉽고 재미있게 재구성해 누구나 함께 참여할 수 있도록 만든 스페셜 클래스입니다. 팀을 이루어 도전하고 협력하는 과정에서 자연스럽게 몰입과 성취를 경험할 수 있습니다.',
          '단순한 경기 진행에 그치지 않고 응원, 협동, 규칙 이해, 역할 수행이 함께 이루어지도록 구성해 현장의 분위기와 참여도를 높입니다.',
        ],
        tags: ['팀 기반 활동', '협동·응원 중심', '스페셜 클래스'],
        example: '예시: 스포츠 경기, 줄다리기 등',
        mediaKey: 'programCamp' as HomeMediaKey,
      },
      {
        id: 'sports-booth',
        image: '/images/spokedu/dispatch/dispatch-oneday-event.jpg',
        imageAlt: '체험형 스포츠 부스 현장 체험',
        audience: '학교 · 축제 · 박람회 · 기관 행사',
        name: '체험형 스포츠 부스',
        subtitle: '다양한 종목을 경험하는 스포츠 체험 부스',
        paragraphs: [
          '여러 가지 스포츠와 활동 요소를 짧고 직관적으로 경험할 수 있도록 구성한 체험형 부스입니다. 핵심 동작과 규칙을 부담 없이 접할 수 있어 처음 참여하는 아동도 쉽고 즐겁게 몰입할 수 있습니다.',
          '운영 목적과 참여 인원에 맞춰 구성을 유연하게 조정할 수 있으며, 짧은 시간 안에도 높은 참여도와 현장 활기를 이끌어낼 수 있도록 진행합니다.',
        ],
        tags: ['순환형 체험 구성', '높은 참여도', '현장 맞춤 운영'],
        example: '예시: 자이언트 체스, 에듀테크 등',
        href: `${SPOKEDU_BASE_PATH}/programs/oneday-event`,
        trackLabel: 'dispatch-lineup-oneday',
        mediaKey: 'programOneday' as HomeMediaKey,
      },
      {
        id: 'custom',
        audience: '어린이집 · 학교 · 센터 · 복지기관',
        name: '커스터마이징',
        subtitle: '대상과 목적에 맞춰 설계하는 맞춤형 체육 클래스',
        paragraphs: [
          '연령, 인원, 공간, 운동 수준, 운영 목적에 맞춰 가장 적합한 형태로 구성하는 맞춤형 체육 클래스입니다. 획일적인 수업이 아닌 현장에 실제로 필요한 내용과 흐름을 반영해 효율적으로 운영할 수 있도록 설계합니다.',
          '기초체력, 협동 활동, 학교체육, 뉴스포츠, 놀이체육 등 다양한 방향으로 조정할 수 있으며, 기관 특성과 참여자 수준에 맞춘 현실적인 클래스 구성을 제안합니다.',
        ],
        tags: ['맞춤형 설계', '유연한 구성 운영', '현장 중심 제안'],
        example: '예시: 자유로운 테마 융복합 등',
        mediaKey: 'trackDispatch' as HomeMediaKey,
      },
    ] satisfies DispatchLineupItem[],
  },
  operationTypes: {
    eyebrow: '운영 형태',
    title: '운영 형태를 선택하세요',
    rows: [
      {
        label: '정규수업',
        description: '매주 반복되는 흐름 안에서 아이들의 움직임 습관과 참여 경험을 쌓습니다.',
      },
      {
        label: '원데이 행사',
        description: '기관 행사 일정에 맞춰 협동 미션과 체육 활동을 짧고 강하게 구성합니다.',
      },
      {
        label: '방학캠프',
        description: '방학 기간 동안 체육과 예체능 활동을 결합해 하루 단위 몰입 경험을 만듭니다.',
      },
    ],
    mediaKey: 'programOneday' as HomeMediaKey,
  },
  processSteps: {
    eyebrow: '도입 절차',
    title: '가장 빠르고 확실한 도입 프로세스',
    lead: '복잡한 절차 없이, 문의 접수 후 최단 7일 이내에 프리미엄 체육 수업이 시작됩니다.',
    steps: [
      {
        num: '01',
        label: '상담 및 접수',
        detail: '웹사이트 폼, 전화 또는 카카오 채널로 파견 문의를 접수합니다.',
        duration: '당일~24시간',
      },
      {
        num: '02',
        label: '기관 환경 분석',
        detail: '대상 연령, 인원, 특이사항을 파악해 기관에 맞는 제안서를 발송합니다.',
        duration: '1~2일',
      },
      {
        num: '03',
        label: '일정·조건 협의',
        detail: '파견 일정과 수업 구성 등을 협의하고 진행 방식을 확정합니다.',
        duration: '1~3일',
      },
      {
        num: '04',
        label: '전담 강사 배정',
        detail: '기관의 성향과 목표에 맞는 검증된 강사를 매칭합니다.',
        duration: '3~5일',
      },
      {
        num: '05',
        label: '첫 수업 개시',
        detail: '기관 담당자와 사전 오리엔테이션 후, 첫 수업을 시작합니다.',
        duration: '7일 이내',
      },
    ] as const,
  },
  examples: {
    eyebrow: '사례',
    title: '실제 운영 사례',
    href: `${SPOKEDU_BASE_PATH}/cases`,
    trackLabel: 'dispatch-cases',
    items: [
      {
        venue: '양천거점형키움센터',
        audience: '초등 저학년',
        operation: 'SPOMOVE 정규수업',
        activity: '시각 자극 반응형 에듀테크 체육',
        mediaKey: 'proofClass' as HomeMediaKey,
        href: `${SPOKEDU_BASE_PATH}/cases/yangcheon-spomove`,
      },
      {
        venue: 'PLAYZ Lounge',
        audience: '초등 방학',
        operation: '방학 원데이 캠프',
        activity: '체육·예체능 결합 몰입 프로그램',
        mediaKey: 'proofLounge' as HomeMediaKey,
        href: `${SPOKEDU_BASE_PATH}/cases/playz-camp`,
      },
      {
        venue: '동작거점형키움센터',
        audience: '거점센터 연계',
        operation: '에듀테크 체육수업',
        activity: '리듬·타이밍 반응형 수업 운영',
        mediaKey: 'proofCenter' as HomeMediaKey,
        href: `${SPOKEDU_BASE_PATH}/records`,
      },
    ] satisfies DispatchExampleItem[],
  },
  faq: {
    eyebrow: 'FAQ',
    title: '기관 담당자분들이 자주 묻는 질문',
    items: [
      {
        q: '비용은 어떻게 되나요?',
        a: '기관 규모, 대상 연령, 파견 횟수에 따라 달라집니다. 제안서 신청 후 맞춤 견적을 안내드립니다.',
      },
      {
        q: '최소 계약 기간이 있나요?',
        a: '없습니다. 원데이 수업부터, 단기, 정기 수업까지 모두 가능합니다.',
      },
      {
        q: '강사 교체 요청이 가능한가요?',
        a: '네, 담당 매니저를 통해 언제든 요청 가능합니다.',
      },
      {
        q: '특수학급 아동이 포함된 통합반도 운영되나요?',
        a: '느린 학습자와 특수 체육 대상자를 고려한 수업 경험이 있는 강사가 함께합니다.',
      },
      {
        q: '운영 가능한 지역이 어디인가요?',
        a: '현재 서울 및 수도권 근교 지역에서 운영 중입니다. 운영 가능 여부는 문의 시 확인해 드립니다.',
      },
    ] as const,
  },
  finalCta: {
    title: '기관에 맞는 체육 프로그램을 제안받아 보세요',
    description:
      '대상 연령, 인원, 공간, 일정을 확인한 뒤 정규수업·원데이·방학캠프 중 적합한 운영안을 안내드립니다.',
    mediaKey: 'trackDispatch' as HomeMediaKey,
    primary: {
      label: '기관 프로그램 제안받기',
      href: `${SPOKEDU_BASE_PATH}/contact?type=dispatch`,
      trackLabel: 'dispatch-final-program',
    },
  },
} as const;
