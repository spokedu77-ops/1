export const SPOKEDU_BASE_PATH = '/spokedu';

export type SeoMetaItem = {
  title: string;
  description: string;
};

export type NavItem = {
  label: string;
  path: string;
  href: string;
};

export type TrackItem = {
  title: string;
  subtitle: string;
  description: string;
  href: string;
  cta: string;
};

export type PhilosophyCardItem = {
  code: 'BODY' | 'BRAIN' | 'TOGETHER';
  title: string;
  description: string;
};

export type ProgramAssetItem = {
  title: string;
  description: string;
  linksTo: string[];
  effects: string[];
  href: string;
  imageSlot: string;
  imageAlt: string;
  imageSrc?: string;
};

export type ProofItem = {
  title: string;
  description: string;
  imageSlot: string;
  imageAlt: string;
  imageSrc?: string;
};

export type SectionBlock = {
  title: string;
  points: string[];
};

export type ContactType = {
  title: string;
  description: string;
  requiredFields: string[];
  cta: string;
  href: string;
};

export type DetailCard = {
  title: string;
  description: string;
};

export type GroupRecommendation = {
  group: string;
  programs: string[];
};

export type LinkCard = {
  title: string;
  description: string;
  href: string;
};

export type ImageSlotItem = {
  slot: string;
  title: string;
  caption: string;
  alt: string;
  src?: string;
};

export const navItems: NavItem[] = [
  { label: '브랜드', path: '/about', href: `${SPOKEDU_BASE_PATH}/about` },
  { label: '개인수업', path: '/private', href: `${SPOKEDU_BASE_PATH}/private` },
  { label: '기관수업', path: '/dispatch', href: `${SPOKEDU_BASE_PATH}/dispatch` },
  { label: '커리큘럼', path: '/curriculum', href: `${SPOKEDU_BASE_PATH}/curriculum` },
  { label: '프로그램', path: '/programs', href: `${SPOKEDU_BASE_PATH}/programs` },
  { label: '현장기록', path: '/records', href: `${SPOKEDU_BASE_PATH}/records` },
  { label: '문의', path: '/contact', href: `${SPOKEDU_BASE_PATH}/contact` },
];

export const coreTracks: TrackItem[] = [
  {
    title: 'Private Class',
    subtitle: '아이에게 맞춘 1:1·소그룹 체육수업',
    description:
      '운동을 싫어하거나 체육시간이 부담스러운 아이에게 움직임 자신감과 기본 신체기능을 설계합니다.',
    href: `${SPOKEDU_BASE_PATH}/private`,
    cta: '개인수업 보기',
  },
  {
    title: 'Dispatch Solution',
    subtitle: '기관에 맞춘 파견형 체육교육 프로그램',
    description:
      '유치원, 어린이집, 키움센터, 지역아동센터, 학교, 키즈 공간 운영 목적에 맞춰 정규수업부터 원데이까지 제안합니다.',
    href: `${SPOKEDU_BASE_PATH}/dispatch`,
    cta: '기관수업 보기',
  },
  {
    title: 'Curriculum & Contents',
    subtitle: '선생님을 위한 커리큘럼·콘텐츠·강사교육',
    description:
      '현장에서 검증한 수업을 수업안, 교구 활용법, 운영 매뉴얼, 강사 교육 콘텐츠로 정리해 반복 가능한 구조를 만듭니다.',
    href: `${SPOKEDU_BASE_PATH}/curriculum`,
    cta: '커리큘럼 보기',
  },
];

export const philosophyCards: PhilosophyCardItem[] = [
  {
    code: 'BODY',
    title: '몸을 잘 쓰는 힘',
    description:
      '달리기, 점프, 균형, 협응, 방향전환처럼 성장 과정에서 꼭 필요한 기본 움직임을 놀이 안에서 익힙니다.',
  },
  {
    code: 'BRAIN',
    title: '보고 판단하고 반응하는 힘',
    description:
      '색, 위치, 리듬, 규칙을 보고 스스로 움직임을 선택하며 타이밍에 맞춰 몸으로 반응하는 경험을 설계합니다.',
  },
  {
    code: 'TOGETHER',
    title: '함께 움직이는 힘',
    description:
      '규칙을 이해하고 기다리고 협동하며 도전하는 과정을 통해 사회성과 자신감을 함께 키웁니다.',
  },
];

export const programAssets: ProgramAssetItem[] = [
  {
    title: 'SPOMOVE',
    description: '보고, 선택하고, 판단하고, 움직이는 빔 기반 에듀테크 놀이체육',
    linksTo: ['Private', 'Dispatch', 'Curriculum'],
    effects: ['집중력', '반응속도', '타이밍', '방향전환'],
    href: `${SPOKEDU_BASE_PATH}/programs/spomove`,
    imageSlot: 'program-spomove',
    imageAlt: 'SPOMOVE 빔 기반 놀이체육 수업 장면',
  },
  {
    title: 'PAPS 연계 놀이체육',
    description: '초등 기초체력 요소를 놀이체육으로 경험하는 프로그램',
    linksTo: ['Dispatch', 'Curriculum'],
    effects: ['심폐지구력', '근력', '유연성', '순발력'],
    href: `${SPOKEDU_BASE_PATH}/programs/paps`,
    imageSlot: 'program-paps',
    imageAlt: 'PAPS 연계 놀이체육 활동 장면',
  },
  {
    title: '놀이체육 정규수업',
    description: '기본 움직임과 운동 습관을 만드는 스포키듀의 기본 수업 자산',
    linksTo: ['Private', 'Dispatch'],
    effects: ['기본움직임', '운동습관', '자신감', '사회성'],
    href: `${SPOKEDU_BASE_PATH}/programs/play-class`,
    imageSlot: 'program-play-class',
    imageAlt: '놀이체육 정규수업에서 아이들이 움직이는 장면',
  },
  {
    title: '원데이 체육행사',
    description: '기관 행사와 특별활동에 맞춘 체육 기반 체험 프로그램',
    linksTo: ['Dispatch'],
    effects: ['몰입', '협동', '체험', '단체활동'],
    href: `${SPOKEDU_BASE_PATH}/programs/oneday-event`,
    imageSlot: 'program-oneday',
    imageAlt: '원데이 체육행사 단체 활동 장면',
  },
  {
    title: '방학캠프',
    description: '체육과 예체능을 결합한 방학 시즌 집중 프로그램',
    linksTo: ['Private', 'Dispatch'],
    effects: ['종일체험', '돌봄', '신체활동', '협동'],
    href: `${SPOKEDU_BASE_PATH}/programs/camp`,
    imageSlot: 'program-camp',
    imageAlt: '방학캠프에서 체육과 예체능 활동을 하는 장면',
  },
  {
    title: '커리큘럼 콘텐츠',
    description: '수업안, 교구 활용법, 월간 프로그램, 강사 교육 콘텐츠',
    linksTo: ['Curriculum'],
    effects: ['수업안', '매뉴얼', '강사교육', '라이선싱'],
    href: `${SPOKEDU_BASE_PATH}/programs/curriculum-content`,
    imageSlot: 'program-curriculum-content',
    imageAlt: '커리큘럼 콘텐츠 자료와 수업안이 배치된 장면',
  },
];

export const proofItems: ProofItem[] = [
  {
    title: '스포키듀 LAB',
    description: '프로그램 개발, 강사 교육, 교구 연구, 현장 적용을 운영하는 기반 공간',
    imageSlot: 'proof-lab',
    imageAlt: '스포키듀 LAB 수업 준비 및 연구 공간 장면',
  },
  {
    title: '양천거점형키움센터 SPOMOVE',
    description: '기관 맞춤형 에듀테크 체육 운영 사례',
    imageSlot: 'proof-yangcheon',
    imageAlt: '양천거점형키움센터 SPOMOVE 수업 장면',
  },
  {
    title: '동작거점형키움센터 리듬챌린지',
    description: '협동·반응 중심 활동 운영 사례',
    imageSlot: 'proof-dongjak',
    imageAlt: '동작거점형키움센터 리듬챌린지 수업 장면',
  },
  {
    title: '다사랑영등포지역아동센터 원데이 체육행사',
    description: '기관 행사형 프로그램 운영 사례',
    imageSlot: 'proof-dasarang',
    imageAlt: '다사랑영등포지역아동센터 원데이 체육행사 장면',
  },
  {
    title: 'PLAYZ Lounge 방학캠프',
    description: '방학 시즌 결합형 체육 프로그램 운영 사례',
    imageSlot: 'proof-playz',
    imageAlt: 'PLAYZ Lounge 방학캠프 활동 장면',
  },
  {
    title: '서대문형무소 어린이날 체험 부스',
    description: '공공 공간 연계 체험형 체육 콘텐츠 운영 사례',
    imageSlot: 'proof-seodaemun',
    imageAlt: '서대문형무소 어린이날 체험 부스 운영 장면',
  },
  {
    title: '월간 스포키듀 운영 기록',
    description: '현장 경험을 월간 기록으로 축적·공유하는 운영 체계',
    imageSlot: 'proof-monthly',
    imageAlt: '월간 스포키듀 운영 기록 문서와 회의 장면',
  },
];

export const privateClassSections: SectionBlock[] = [
  {
    title: '이런 아이에게 필요합니다',
    points: [
      '운동을 싫어하는 아이',
      '몸을 어색하게 쓰는 아이',
      '체육시간이 부담스러운 아이',
      '체력이 약한 아이',
      '소극적인 아이',
      '친구와 함께하는 활동이 어려운 아이',
    ],
  },
  {
    title: '상담 흐름',
    points: ['아이 연령 확인', '운동 경험 확인', '학부모 고민 확인', '수업 형태 추천', '장소/시간 조율', '수업 시작'],
  },
];

export const dispatchSections: SectionBlock[] = [
  {
    title: '기관 맞춤 기준',
    points: ['공간 맞춤', '인원 맞춤', '연령 맞춤', '목적 맞춤'],
  },
  {
    title: '운영 프로세스',
    points: ['문의', '대상·공간·인원 확인', '프로그램 제안', '일정·운영 방식 조율', '수업 운영', '수업 기록·후속 제안'],
  },
];

export const curriculumSections: SectionBlock[] = [
  {
    title: '왜 커리큘럼이 필요한가',
    points: [
      '연령·공간·인원·목적을 함께 설계',
      '안전 동선과 교구 활용 기준 정리',
      '난이도 조절을 반복 가능한 수업 구조로 표준화',
    ],
  },
  {
    title: '제공 콘텐츠',
    points: ['놀이체육 커리큘럼', '수업안 제작', '교구 활용 콘텐츠', '강사 교육', '월간 프로그램 패키지', '프로그램 라이선싱'],
  },
];

export const privateHero = {
  title: '우리 아이에게 맞는\n개인·소그룹 체육수업을 제안합니다',
  description:
    '운동을 싫어하는 아이, 몸을 어색하게 쓰는 아이, 체육시간이 부담스러운 아이도 아이의 성향과 수준에 맞춰 움직임을 시작할 수 있습니다.',
};

export const privateNeeds: DetailCard[] = [
  { title: '운동을 싫어하는 아이', description: '억지로 시키기보다 놀이처럼 시작해 운동에 대한 거부감을 낮춰야 합니다.' },
  { title: '몸을 어색하게 쓰는 아이', description: '달리기, 점프, 균형, 방향전환이 어색하다면 기본 움직임 경험이 필요합니다.' },
  { title: '체육시간이 부담스러운 아이', description: '못한다는 기억보다 해볼 수 있다는 경험을 먼저 만들어야 합니다.' },
  { title: '체력이 약한 아이', description: '쉽게 지치거나 오래 참여하기 어렵다면 부담 없는 움직임부터 설계해야 합니다.' },
  { title: '소극적인 아이', description: '운동을 잘해야만 참여하는 수업이 아니라 작은 성공을 반복하는 수업이 필요합니다.' },
  { title: '친구와 함께하는 활동이 어려운 아이', description: '규칙을 이해하고 기다리고 함께 움직이는 경험이 필요합니다.' },
];

export const privateClassTypes: DetailCard[] = [
  { title: '1:1 개인 체육수업', description: '아이 한 명의 성향, 수준, 운동 경험에 맞춰 수업을 설계합니다.' },
  { title: '2~4명 소그룹 수업', description: '또래와 함께 움직이며 사회성과 자신감을 함께 경험합니다.' },
  { title: '형제·자매 수업', description: '난이도와 역할을 조정해 함께 참여할 수 있도록 구성합니다.' },
  { title: '친구끼리 그룹 수업', description: '친숙한 관계에서 체육 부담을 줄이고 참여도를 높입니다.' },
  { title: '운동 자신감 수업', description: '운동을 못한다는 기억보다 해볼 수 있다는 경험을 반복합니다.' },
  { title: '초등 기초체력 수업', description: 'PAPS식 측정이 아니라 놀이 안에서 기초체력 요소를 경험합니다.' },
];

export const privateLocations: DetailCard[] = [
  { title: '스포키듀 LAB', description: '프로그램 개발과 수업 준비가 이루어지는 기준 공간입니다.' },
  { title: '아파트 커뮤니티', description: '생활권 안에서 아이가 익숙하게 참여할 수 있습니다.' },
  { title: '공원·야외 공간', description: '달리기, 민첩성, 협동 활동에 적합한 형태로 운영합니다.' },
  { title: '대관 체육공간', description: '그룹 수업이나 집중 수업에 맞게 활용할 수 있습니다.' },
  { title: '기관·센터 공간', description: '기관 연계 수업이나 공간 협의가 가능한 경우 진행합니다.' },
  { title: '협의 가능한 공간', description: '아이 상황과 수업 목적에 맞춰 장소를 함께 조율합니다.' },
];

export const privateTopics = ['기본 움직임', '균형감각', '민첩성', '협응력', '기초체력', '운동 자신감', '체육시간 적응', '사회성'];

export const privateOutcomes: DetailCard[] = [
  { title: '움직임 자신감', description: '내 몸을 사용해보고 성공하는 경험을 통해 움직임 자신감을 얻습니다.' },
  { title: '기본 신체기능', description: '달리기, 점프, 균형, 방향전환, 협응처럼 성장에 필요한 움직임을 경험합니다.' },
  { title: '운동에 대한 긍정적 기억', description: '억지로 하는 운동이 아니라 해볼 만하다는 기억을 만듭니다.' },
  { title: '집중력과 반응속도', description: '보고, 듣고, 판단하고, 타이밍에 맞춰 반응하는 과정을 경험합니다.' },
  { title: '사회성', description: '친구와 함께 규칙을 지키고 기다리고 협동하는 경험을 쌓습니다.' },
  { title: '체육활동 적응력', description: '학교 체육시간이나 단체활동에 대한 부담을 줄입니다.' },
];

export const privateConsultFlow = ['아이 연령 확인', '현재 운동 경험 확인', '학부모 고민 확인', '수업 형태 추천', '장소/시간 조율', '수업 시작'];

export const privateCtas = [
  { label: '1:1 체육수업 문의', href: `${SPOKEDU_BASE_PATH}/contact?type=private` },
  { label: '소그룹 수업 문의', href: `${SPOKEDU_BASE_PATH}/contact?type=private` },
];

export const homeHeroImage: ImageSlotItem = {
  slot: 'home-hero-main',
  title: 'Home Hero 대표 이미지',
  caption: '아이들이 움직이는 대표 수업 장면 또는 스포키듀 LAB 수업 준비 장면',
  alt: '스포키듀 대표 수업 장면',
};

export const privateImageSlots: ImageSlotItem[] = [
  {
    slot: 'private-1to1',
    title: '1:1 수업 장면',
    caption: '아이와 코치가 1:1로 움직임을 지도하는 장면',
    alt: '스포키듀 1대1 체육수업 장면',
  },
  {
    slot: 'private-small-group',
    title: '소그룹 수업 장면',
    caption: '2~4명 소그룹이 함께 참여하는 수업 장면',
    alt: '스포키듀 소그룹 체육수업 장면',
  },
  {
    slot: 'private-tool-activity',
    title: '교구 활용 장면',
    caption: '아이가 교구를 활용해 움직임 활동을 수행하는 장면',
    alt: '아이가 체육 교구를 활용하는 수업 장면',
  },
];

export const dispatchHero = {
  title: '기관의 공간, 인원, 운영 목적에 맞춰\n파견형 체육교육 프로그램을 제안합니다',
  description:
    '유치원, 어린이집, 키움센터, 지역아동센터, 학교, 키즈 복합공간, 공공기관에 정규수업, 원데이 체육행사, 방학캠프, SPOMOVE, PAPS를 제안합니다.',
};

export const dispatchCriteria: DetailCard[] = [
  { title: '공간 맞춤', description: '체육관, 강당, 교실형 공간, 활동실, 실내 놀이공간에 맞춰 수업 구조를 조정합니다.' },
  { title: '인원 맞춤', description: '소그룹부터 단체 수업까지 대기 시간을 줄이고 참여 흐름을 높입니다.' },
  { title: '연령 맞춤', description: '유아, 초등 저학년, 고학년, 혼합 연령까지 난이도를 단계적으로 조정합니다.' },
  { title: '목적 맞춤', description: '정규수업, 행사, 캠프, 체력 향상, 협동 활동 등 운영 목적 기준으로 제안합니다.' },
];

export const dispatchOperationTypes: DetailCard[] = [
  { title: '기관 정규수업', description: '매주 또는 정기적으로 운영되는 파견형 체육교육 프로그램입니다.' },
  { title: '방과후 체육수업', description: '하원 전후, 돌봄 시간, 방과후 시간대에 맞춰 운영할 수 있습니다.' },
  { title: '원데이 체육행사', description: '어린이날, 방학, 시즌 행사, 특별활동에 맞춘 집중형 프로그램입니다.' },
  { title: '방학캠프', description: '체육을 중심으로 미술, 댄스, 체스 등 예체능 활동을 결합합니다.' },
  { title: 'SPOMOVE', description: '빔 기반 에듀테크 놀이체육으로 몰입과 반응 경험을 강화합니다.' },
  { title: 'PAPS 연계 놀이체육', description: '초등 기초체력 요소를 놀이체육 방식으로 경험하도록 구성합니다.' },
];

export const dispatchSpaceModels: DetailCard[] = [
  { title: '소규모 실내공간', description: '이동거리를 줄이고 소도구·규칙 중심으로 안정적으로 운영합니다.' },
  { title: '10명 내외 소그룹', description: '아이 한 명 한 명의 움직임을 세밀하게 관찰하고 피드백합니다.' },
  { title: '20명 이상 단체', description: '팀별 미션, 순환 활동, 협동 챌린지 방식으로 흐름을 설계합니다.' },
  { title: '혼합 연령', description: '규칙은 단순하게, 난이도는 단계적으로 구성합니다.' },
  { title: '방학 시즌 집중 운영', description: '하루 단위 또는 단기 집중 프로그램으로 운영할 수 있습니다.' },
  { title: '정규수업 반복 운영', description: '반복 경험으로 움직임 습관과 자신감을 쌓는 구조를 만듭니다.' },
];

export const dispatchRecommendations: GroupRecommendation[] = [
  { group: '유치원·어린이집', programs: ['놀이체육 정규수업', '협동 놀이체육', '원데이 체육행사'] },
  { group: '초등학교·방과후 기관', programs: ['놀이체육', 'SPOMOVE', 'PAPS', '뉴스포츠·협동체육'] },
  { group: '키움센터', programs: ['SPOMOVE', '놀이체육', '뉴스포츠', '원데이 체육행사'] },
  { group: '지역아동센터', programs: ['원데이 체육행사', '협동 놀이체육', '뉴스포츠', '기초 신체기능 프로그램'] },
  { group: '키즈 복합공간', programs: ['원데이 체육행사', '방학캠프', '예체능 결합 프로그램', 'SPOMOVE'] },
];

export const dispatchCases = [
  '양천거점형키움센터 SPOMOVE',
  '동작거점형키움센터 리듬챌린지',
  '다사랑영등포지역아동센터 원데이 체육행사',
  'PLAYZ Lounge 방학캠프',
  '서대문형무소 어린이날 체험 부스',
];

export const dispatchProcess = ['문의', '대상·공간·인원 확인', '프로그램 제안', '일정·운영 방식 조율', '수업 운영', '수업 기록 및 후속 제안'];

export const dispatchCtas = [
  { label: '기관 수업 제안 요청', href: `${SPOKEDU_BASE_PATH}/contact?type=dispatch` },
  { label: '제안서 문의하기', href: `${SPOKEDU_BASE_PATH}/contact?type=dispatch` },
];

export const dispatchImageSlots: ImageSlotItem[] = [
  {
    slot: 'dispatch-group-class',
    title: '기관 단체 수업',
    caption: '기관에서 다수 아동이 참여하는 단체 수업 장면',
    alt: '기관 단체 체육수업 장면',
  },
  {
    slot: 'dispatch-kiwoom-center',
    title: '키움센터/지역아동센터',
    caption: '키움센터 또는 지역아동센터 현장 운영 장면',
    alt: '키움센터 체육 프로그램 운영 장면',
  },
  {
    slot: 'dispatch-event-class',
    title: '행사형 수업',
    caption: '원데이 행사 및 체험형 수업 운영 장면',
    alt: '기관 행사형 체육수업 장면',
  },
];

export const curriculumHero = {
  title: '선생님들의 선생님,\n체육수업을 커리큘럼과 콘텐츠로 만듭니다',
  description:
    '좋은 체육수업이 선생님의 감각에만 의존하지 않도록, 현장에서 검증한 프로그램을 수업안·운영 매뉴얼·교구 활용 콘텐츠·강사교육 콘텐츠로 정리합니다.',
};

export const curriculumWhy =
  '좋은 체육수업은 즉흥적으로만 만들어질 수 없습니다. 아이들의 연령, 공간, 인원, 수업 목적, 안전 동선, 교구 활용, 난이도 조절이 함께 설계되어야 합니다. 스포키듀는 현장에서 운영한 수업을 분석하고 좋은 수업이 반복될 수 있도록 커리큘럼과 콘텐츠로 정리합니다.';

export const curriculumOfferings: DetailCard[] = [
  { title: '놀이체육 커리큘럼', description: '연령, 목적, 움직임 요소에 맞춘 수업 흐름을 체계화합니다.' },
  { title: '수업안 제작', description: '강사가 바로 이해하고 운영할 수 있는 수업안을 제공합니다.' },
  { title: '교구 활용 콘텐츠', description: '원마커, 후프, 콘, 펀스틱 등 교구 활용법을 콘텐츠로 정리합니다.' },
  { title: '강사 교육', description: '수업 흐름, 안전, 피드백, 아이와의 상호작용 운영을 교육합니다.' },
  { title: '월간 프로그램 패키지', description: '기관/강사가 지속적으로 사용할 수 있는 월간 패키지로 확장합니다.' },
  { title: '프로그램 라이선싱', description: 'SPOMOVE, PAPS, 놀이체육 콘텐츠를 파트너에게 제공할 수 있습니다.' },
];

export const curriculumAudience: DetailCard[] = [
  { title: '체육 강사·예체능 강사', description: '수업 아이디어와 운영 매뉴얼이 필요한 선생님' },
  { title: '교육기관·센터', description: '정기적으로 사용할 수 있는 체육 커리큘럼이 필요한 기관' },
  { title: '키즈 공간·교육 브랜드', description: '자체 프로그램으로 도입할 체육 콘텐츠가 필요한 파트너' },
  { title: '프랜차이즈·지점 운영 브랜드', description: '표준화된 수업안과 강사 교육이 필요한 조직' },
];

export const curriculumPrograms = ['SPOMOVE', 'PAPS', '놀이체육 정규수업', '뉴스포츠·협동체육', '원데이 체육행사', '방학캠프'];

export const curriculumFlow = ['현장 수업 분석', '학습 목표 정의', '수업안 구조화', '교구·운영 매뉴얼 제작', '강사 교육 콘텐츠화', '파일럿 적용 및 업데이트'];

export const curriculumCtas = [
  { label: '커리큘럼 문의', href: `${SPOKEDU_BASE_PATH}/contact?type=curriculum` },
  { label: '콘텐츠 제휴 문의', href: `${SPOKEDU_BASE_PATH}/contact?type=curriculum` },
  { label: '강사 교육 문의', href: `${SPOKEDU_BASE_PATH}/contact?type=curriculum` },
];

export const curriculumImageSlots: ImageSlotItem[] = [
  {
    slot: 'curriculum-plan-docs',
    title: '수업안/커리큘럼 자료',
    caption: '수업안 문서, 커리큘럼 시트가 정리된 장면',
    alt: '체육수업 커리큘럼 문서 장면',
  },
  {
    slot: 'curriculum-tool-setup',
    title: '교구 세팅',
    caption: '수업 전 교구와 동선을 세팅하는 장면',
    alt: '체육수업 교구 세팅 장면',
  },
  {
    slot: 'curriculum-instructor-training',
    title: '강사 교육',
    caption: '강사 대상 수업 운영 교육 장면',
    alt: '스포키듀 강사 교육 장면',
  },
];

export const recordsHero = {
  title: '실제 수업과 기록이\n스포키듀의 실체입니다',
  description: '수업 사례, 월간 스포키듀, 교육 인사이트를 통해 현장에서 축적되는 실행 기록을 공유합니다.',
};

export const recordsLinkCards: LinkCard[] = [
  {
    title: '수업 사례',
    description: '실제 기관과 아이들이 참여한 수업 기록을 확인하세요.',
    href: `${SPOKEDU_BASE_PATH}/cases`,
  },
  {
    title: '월간 스포키듀',
    description: '매월 쌓이는 운영 기록과 핵심 변화를 정리합니다.',
    href: `${SPOKEDU_BASE_PATH}/monthly`,
  },
  {
    title: '교육 인사이트',
    description: '아동·청소년 움직임 교육 관점을 콘텐츠로 공유합니다.',
    href: `${SPOKEDU_BASE_PATH}/insights`,
  },
];

export const recordsProofItems: ProofItem[] = [
  {
    title: '스포키듀 LAB',
    description: '프로그램 개발, 강사 교육, 교구 연구, 현장 적용을 운영하는 기반 공간',
    imageSlot: 'records-lab',
    imageAlt: '스포키듀 LAB 현장 기록 이미지',
  },
  {
    title: '양천거점형키움센터 SPOMOVE',
    description: '기관 맞춤형 에듀테크 체육 운영 사례',
    imageSlot: 'records-yangcheon',
    imageAlt: '양천거점형키움센터 SPOMOVE 사례 이미지',
  },
  {
    title: '동작거점형키움센터 리듬챌린지',
    description: '협동·반응 중심 활동 운영 사례',
    imageSlot: 'records-dongjak',
    imageAlt: '동작거점형키움센터 리듬챌린지 사례 이미지',
  },
  {
    title: '다사랑영등포지역아동센터 원데이',
    description: '기관 행사형 프로그램 운영 사례',
    imageSlot: 'records-dasarang',
    imageAlt: '다사랑영등포지역아동센터 원데이 사례 이미지',
  },
  {
    title: 'PLAYZ Lounge 방학캠프',
    description: '방학 시즌 결합형 체육 프로그램 운영 사례',
    imageSlot: 'records-playz',
    imageAlt: 'PLAYZ Lounge 방학캠프 사례 이미지',
  },
  {
    title: '서대문형무소 어린이날 체험 부스',
    description: '공공 공간 연계 체험형 체육 콘텐츠 운영 사례',
    imageSlot: 'records-seodaemun',
    imageAlt: '서대문형무소 어린이날 체험 부스 사례 이미지',
  },
];

export const contactHero = {
  title: '개인수업, 기관수업,\n커리큘럼 문의를 나누어 안내합니다',
  description: '문의 유형에 맞춰 필요한 정보를 먼저 정리하면 상담과 제안이 더 정확해집니다.',
};

export const contactActionCtas = [
  { label: '우리 아이 수업 상담하기', href: `${SPOKEDU_BASE_PATH}/contact?type=private` },
  { label: '1:1 체육수업 문의', href: `${SPOKEDU_BASE_PATH}/contact?type=private` },
  { label: '소그룹 수업 문의', href: `${SPOKEDU_BASE_PATH}/contact?type=private` },
  { label: '기관 수업 제안 요청', href: `${SPOKEDU_BASE_PATH}/contact?type=dispatch` },
  { label: '제안서 문의하기', href: `${SPOKEDU_BASE_PATH}/contact?type=dispatch` },
  { label: '커리큘럼 문의', href: `${SPOKEDU_BASE_PATH}/contact?type=curriculum` },
  { label: '콘텐츠 제휴 문의', href: `${SPOKEDU_BASE_PATH}/contact?type=curriculum` },
  { label: '전화 문의', href: 'tel:010-4437-9294' },
  { label: '이메일 문의', href: 'mailto:help@spokedu.com' },
];

export const contactTypes: ContactType[] = [
  {
    title: '개인·소그룹 수업 문의',
    description: '아이 성향과 현재 고민을 바탕으로 수업 형태를 추천합니다.',
    requiredFields: ['아이 연령', '운동 경험', '현재 고민', '희망 수업 형태', '희망 장소', '희망 요일/시간'],
    cta: '개인수업 문의',
    href: `${SPOKEDU_BASE_PATH}/contact?type=private`,
  },
  {
    title: '기관 파견 수업 문의',
    description: '기관의 대상·공간·인원·일정에 맞춘 운영안을 제안합니다.',
    requiredFields: ['기관명', '대상 연령', '예상 참여 인원', '사용 가능한 공간', '희망 일정', '운영 형태', '희망 프로그램'],
    cta: '기관수업 제안',
    href: `${SPOKEDU_BASE_PATH}/contact?type=dispatch`,
  },
  {
    title: '커리큘럼·콘텐츠 문의',
    description: '강사 교육, 콘텐츠 도입, 제휴·라이선싱 범위를 함께 설계합니다.',
    requiredFields: ['콘텐츠 유형', '대상 연령', '활용 목적', '강사 교육 필요 여부', '기관/브랜드 정보', '제휴/구매 형태'],
    cta: '커리큘럼 문의',
    href: `${SPOKEDU_BASE_PATH}/contact?type=curriculum`,
  },
];

export const seoMeta: Record<string, SeoMetaItem> = {
  home: {
    title: 'SPOKEDU 스포키듀 | 아동·청소년 체육교육 전문 단체',
    description:
      'SPOKEDU는 아이들의 움직임을 교육적으로 설계하고, 그 움직임을 수업·커리큘럼·콘텐츠로 확장하는 아동·청소년 체육교육 전문 단체입니다.',
  },
  about: {
    title: 'SPOKEDU | 우리는 아이를 가르치고, 선생님을 가르치며, 체육수업을 콘텐츠로 만듭니다',
    description: '스포키듀의 교육 철학, 현장 운영, 강사 교육, 커리큘럼 콘텐츠화 구조를 소개합니다.',
  },
  private: {
    title: '개인·소그룹 체육수업 | SPOKEDU Private Class',
    description: '아이의 성향과 수준에 맞춘 1:1·소그룹 체육수업을 제안합니다.',
  },
  dispatch: {
    title: '기관 파견 체육교육 | SPOKEDU Dispatch Solution',
    description: '기관의 공간, 인원, 운영 목적에 맞춘 파견형 체육교육 프로그램을 제안합니다.',
  },
  curriculum: {
    title: '커리큘럼·콘텐츠 | 선생님들을 위한 체육교육 콘텐츠 | SPOKEDU',
    description: '현장에서 검증한 체육수업을 커리큘럼·콘텐츠·강사교육으로 확장합니다.',
  },
  programs: {
    title: 'SPOKEDU 프로그램 | SPOMOVE·PAPS·놀이체육·원데이·방학캠프',
    description: 'SPOMOVE, PAPS, 원데이, 캠프, 커리큘럼 콘텐츠 자산을 소개합니다.',
  },
  records: {
    title: '현장기록 | 수업 사례·월간 스포키듀·교육 인사이트',
    description: '수업 사례, 월간 스포키듀, 교육 인사이트를 통해 현장 운영 실체를 공유합니다.',
  },
  contact: {
    title: 'SPOKEDU 문의 | 개인수업·기관수업·커리큘럼 문의',
    description: '문의 유형에 맞춰 필요한 정보를 안내하고 빠르게 상담을 연결합니다.',
  },
};

export const seoKeywords = {
  home: ['아동 체육교육', '청소년 체육교육', '어린이 체육수업', '초등 체육수업', 'SPOKEDU'],
  private: ['개인 체육수업', '소그룹 체육수업', '체육 과외', '어린이 체육수업', '초등 체육수업'],
  dispatch: ['기관 체육수업', '유치원 체육수업', '키움센터 체육 프로그램', '지역아동센터 체육 프로그램', 'SPOMOVE', 'PAPS 놀이체육'],
  curriculum: ['체육 커리큘럼', '놀이체육 수업안', '강사 교육 콘텐츠', '체육교육 콘텐츠', 'SPOMOVE', 'PAPS 놀이체육'],
  programs: ['SPOMOVE', 'PAPS 놀이체육', '놀이체육 수업안', '어린이 체육수업', '기관 체육수업'],
  records: ['아동 체육교육', '기관 체육수업', '키움센터 체육 프로그램', '지역아동센터 체육 프로그램', 'SPOKEDU 사례'],
  contact: ['개인 체육수업', '소그룹 체육수업', '기관 체육수업', '체육 커리큘럼', '강사 교육 콘텐츠 문의'],
} as const;

export const privateFaq = [
  '1:1 개인수업이 가능한가요?',
  '친구와 같이 소그룹 수업도 가능한가요?',
  '수업 장소는 어디에서 하나요?',
  '방문수업도 가능한가요?',
  '운동을 못해도 괜찮나요?',
  '몇 살부터 가능한가요?',
  '수업료는 어떻게 정해지나요?',
];

export const dispatchFaq = [
  '정규수업과 원데이 행사 모두 가능한가요?',
  '공간이 좁아도 운영 가능한가요?',
  '연령이 섞인 그룹도 수업이 가능한가요?',
  '제안서 형태로 먼저 받아볼 수 있나요?',
  '운영 일정은 얼마나 빨리 시작할 수 있나요?',
  '기관 예산에 맞춘 형태로 조정이 가능한가요?',
];

export const legacyRouteMappings = [
  { source: '/info/private', target: `${SPOKEDU_BASE_PATH}/private` },
  { source: '/info/dispatch', target: `${SPOKEDU_BASE_PATH}/dispatch` },
];

