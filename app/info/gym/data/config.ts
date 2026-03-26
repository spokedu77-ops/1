export const GYM_CONFIG = {
  center: {
    name: "SPOKEDU LAB",
    tagline: "MOVE CORE 중심 아동청소년 체육교육 LAB",
    address: "서울시 강동구 성내동 430-2, 7층 2호",
    hours: "평일 13:00-20:00 / 토 09:00-20:00 / 일요일 프로그램 운영",
    privacyUrl: "javascript:void(0)",
  },
  phoneParts: ["010", "4437", "9294"] as [string, string, string],
  kakao: {
    webUrl: "http://pf.kakao.com/_VGWxeb/chat",
    deepLink: "",
  },
  leadEndpoint:
    "https://script.google.com/macros/s/AKfycbwja8ZzKpyyNuRuPoBz6Mkp_SzHf0Bh9rGraip3GnHwPicOhadsZaoTYThcnAa_5OBfnw/exec",
} as const;

export const TRUST_ASSET_LINES = [
  "연세대학교 체육교육학과 졸업생이 만든 커리큘럼을 기반으로 수업 구조를 설계합니다.",
  "관찰 기반으로 시작점을 조정하고, 수업/활동 리포트로 변화를 정리합니다.",
  "3만 개 수업 경험과 1만 명 학생 지도 경험을 바탕으로 운영 루틴과 성장 경로를 설계합니다.",
] as const;

export const LAB_INTRO_POINTS = [
  "무브코어 클럽\n스크린 속 신호, 색, 규칙 등을 보고 아이들이 반응하며 움직이는 놀이체육 수업입니다.\n단순히 스크린만 보고 따라하는 방식이 아니라, 수업 안에서 필요한 기초 움직임(균형, 협응, 점프, 달리기, 멈추기 등) 활동도 함께 병행하여 진행합니다.\n아이들이 재미있게 몰입하면서도 실제로 몸을 더 안정적이고 자연스럽게 쓸 수 있도록 돕는 수업입니다.",
  "커스터마이징 랩\n생활체육, 학교체육, 기초체력, 희망 종목 등 아이의 현재 상태와 보호자님께서 원하시는 방향에 맞춰 맞춤형으로 진행 가능합니다.\n전체 수업은 아이 눈높이에 맞게 재미있게 참여하면서도 자연스럽게 성장할 수 있도록 설계하고 있습니다.",
  "적응형 무브 클래스: 안정적인 리듬으로 참여 경험을 키우는 수업",
  "관찰 기반 시작점 조정: 아이의 참여 리듬을 보고 소그룹 과제를 맞춥니다.",
  "분기 변화 리포트: 무엇이 달라졌는지 정리하고 다음 목표를 제안합니다.",
] as const;

export interface ClassTrack {
  key: "move-core-club" | "customizing-lab" | "adaptive-move-class";
  title: string;
  subtitle: string;
  bullets: string[];
}

export const CLASS_TRACKS: ClassTrack[] = [
  {
    key: "move-core-club",
    title: "MOVE CORE CLUB",
    subtitle: "정규 성장 클래스",
    bullets: [
      "스크린 속 신호·색·규칙을 보고 반응하며 움직이는 놀이체육",
      "균형·협응·점프·달리기·멈추기 같은 '필요 움직임'을 함께 병행",
      "재미있게 몰입하면서도 몸을 더 안정적이고 자연스럽게 쓰도록 돕습니다",
    ],
  },
  {
    key: "customizing-lab",
    title: "CUSTOMIZING LAB",
    subtitle: "맞춤 보완 클래스",
    bullets: [
      "생활체육·학교체육·기초체력·희망 종목 등: 아이에게 맞는 과제를 선택합니다",
      "아이의 현재 상태와 보호자님 목표를 반영해 소그룹 맞춤 과제로 진행합니다",
      "아이 눈높이에 맞게 재미있게 참여하면서도 자연스럽게 성장하도록 설계합니다",
    ],
  },
  {
    key: "adaptive-move-class",
    title: "Adaptive Move Class",
    subtitle: "적응형 무브 클래스",
    bullets: [
      "참여 리듬을 안정적으로 만드는 진행",
      "작은 성공 경험을 먼저 쌓는 구조",
      "자신감-참여도-지속성을 키우는 클래스",
    ],
  },
];

export const WHY_US_ITEMS = [
  {
    title: "50분 표준 루틴",
    desc: "도입-기본-적용-정리 흐름으로 집중과 참여를 꾸준히 유지합니다.",
  },
  {
    title: "분기 변화 리포트 & 게임 적용",
    desc: "관찰 기반으로 분기 변화 포인트를 정리하고, 다양한 게임/스포츠 상황에 배운 움직임을 연결합니다.",
  },
] as const;

export interface AgeBand {
  title: string;
  focus: string;
}

export const AGE_BANDS: AgeBand[] = [
  { title: "미취학 (6-7세)", focus: "처음 운동 루틴 만들기 / 안전한 공간 적응 / 친구와 규칙 지키기" },
  { title: "초등 저학년 (1-3학년)", focus: "게임 안에서 역할 이해 / 반응·협응 향상 / 팀 소통 시작" },
  { title: "초등 고학년 (4-6학년)", focus: "멀티스포츠 전략 / 자기조절 / 전이(transfer) 적용" },
];

export interface SlotRow {
  age: string;
  status: "open" | "limited" | "wait";
  label: string;
}

export const SLOTS: SlotRow[] = [
  { age: "미취학 (6-7세)", status: "open", label: "모집중" },
  { age: "초등 저학년 (1-3학년)", status: "limited", label: "마감임박" },
  { age: "초등 고학년 (4-6학년)", status: "open", label: "모집중" },
];

export interface WeeklyOperation {
  title: string;
  purpose: string;
  items: string[];
}

export const WEEKLY_OPERATIONS: WeeklyOperation[] = [
  {
    title: "월-금",
    purpose: "성장/보완 운영",
    items: ["MOVE CORE CLUB", "CUSTOMIZING LAB", "Adaptive Move Class"],
  },
  {
    title: "토요일",
    purpose: "원데이/이벤트 운영",
    items: ["원데이 이벤트 수업", "체험형 미션 클래스"],
  },
];

export const CURRICULUM_WEEKS = [
  { week: 1, title: "경험", subtitle: "움직임 탐색 시작", phase: "경험" },
  { week: 2, title: "경험", subtitle: "기본 루틴 적응", phase: "경험" },
  { week: 3, title: "경험", subtitle: "규칙 이해 확장", phase: "경험" },
  { week: 4, title: "발전", subtitle: "기초 과제 누적", phase: "발전" },
  { week: 5, title: "발전", subtitle: "속도/리듬 안정", phase: "발전" },
  { week: 6, title: "발전", subtitle: "협응 패턴 강화", phase: "발전" },
  { week: 7, title: "통합", subtitle: "게임 적용 시작", phase: "통합" },
  { week: 8, title: "통합", subtitle: "팀플레이 확장", phase: "통합" },
  { week: 9, title: "통합", subtitle: "종목 전이 연습", phase: "통합" },
  { week: 10, title: "리포트", subtitle: "관찰 정리", phase: "리포트" },
  { week: 11, title: "리포트", subtitle: "코치 피드백", phase: "리포트" },
  { week: 12, title: "리포트", subtitle: "다음 분기 목표", phase: "리포트" },
] as const;

export interface Instructor {
  id: string;
  name: string;
  tag: string;
  yearsExp: string;
  philosophy: string;
  badges: string[];
  desc: string;
}

export const INSTRUCTORS: Instructor[] = [
  {
    id: "inst-1",
    name: "최지훈 원장",
    tag: "센터 운영 총괄",
    yearsExp: "8년",
    philosophy: "아이들이 몸으로 배운 자신감을 일상까지 이어가게 만드는 것이 목표입니다.",
    badges: ["연세대 체교 기반", "분기 설계", "게임 적용"],
    desc: "도입-기본-적용-정리 50분 루틴을 안정적으로 운영합니다.",
  },
  {
    id: "inst-2",
    name: "김윤기 총괄",
    tag: "수업 설계 총괄",
    yearsExp: "6년",
    philosophy: "한 번의 수업보다 꾸준히 이어지는 수업 구조가 더 큰 변화를 만든다고 믿습니다.",
    badges: ["맞춤 보완", "소그룹 운영", "수업/활동 리포트"],
    desc: "수업 목표를 단계별로 쪼개고, 주간 운영에 맞춰 보완 흐름을 설계합니다.",
  },
  {
    id: "inst-3",
    name: "김구민 수업 팀장",
    tag: "현장 수업 팀장",
    yearsExp: "7년",
    philosophy: "아이들이 서로 협력하며 끝까지 해내는 경험을 만드는 것을 가장 중요하게 봅니다.",
    badges: ["적응형 진행", "참여 중심", "관계 형성"],
    desc: "안정적인 수업 리듬으로 참여 자신감과 지속성을 높입니다.",
  },
];

export const REPORT_OBSERVATIONS = [
  "지시 전환 상황에서 반응 속도가 달라졌는지",
  "게임 규칙이 바뀌어도 참여가 끊기지 않는지",
  "팀 활동에서 역할 수행이 안정적으로 이어지는지",
  "과제를 끝까지 마무리하는 지속력이 생겼는지",
] as const;

export interface ReviewItem {
  id: string;
  text: string;
  who: string;
  course: string;
  before: string;
  after: string;
  ageBadge: string;
  periodBadge: string;
}

export const REVIEWS: ReviewItem[] = [
  {
    id: "rv-1",
    text: "체육을 싫어하던 아이가 먼저 가방을 챙길 정도로 달라졌어요.",
    who: "초2 보호자",
    course: "MOVE CORE CLUB",
    before: "처음엔 팀 활동에서 뒤로 빠지는 편",
    after: "12주 후 먼저 팀 게임에 참여",
    ageBadge: "초등 저학년",
    periodBadge: "12주",
  },
  {
    id: "rv-2",
    text: "수업이 끝난 뒤에도 집에서 규칙 놀이를 스스로 제안해요.",
    who: "초4 보호자",
    course: "MOVE CORE CLUB",
    before: "팀 활동에서 소극적",
    after: "역할을 먼저 맡고 이어감",
    ageBadge: "초등 고학년",
    periodBadge: "16주",
  },
  {
    id: "rv-3",
    text: "낯가림이 심했는데 지금은 코치님에게 먼저 인사해요.",
    who: "7세 보호자",
    course: "CUSTOMIZING LAB",
    before: "균형 과제에서 자주 포기",
    after: "반복 과제를 끝까지 수행",
    ageBadge: "미취학",
    periodBadge: "8주",
  },
  {
    id: "rv-4",
    text: "수업 분위기가 안정적이라 아이가 부담 없이 적응했어요.",
    who: "초1 보호자",
    course: "Adaptive Move Class",
    before: "활동 전환 시 긴장감 높음",
    after: "자연스럽게 활동 전환 참여",
    ageBadge: "초등 저학년",
    periodBadge: "12주",
  },
  {
    id: "rv-5",
    text: "수업/활동 리포트 덕분에 부모가 도와줄 포인트가 명확해졌습니다.",
    who: "중1 보호자",
    course: "MOVE CORE CLUB + LAB",
    before: "변화 체감이 모호함",
    after: "변화 포인트와 다음 목표 명확",
    ageBadge: "초등 고학년",
    periodBadge: "12주",
  },
];

export interface SlideData {
  heading: string;
  title: string;
  body: string;
  src?: string;
  svgTheme: {
    col1: string;
    col2: string;
  };
}

export const SLIDES_DATA: SlideData[] = [
  {
    heading: "정규 클래스",
    title: "MOVE CORE CLUB 수업 장면",
    body: "게임 기반 적용으로 배운 움직임을 실제 상황에 연결합니다.",
    // MOVE CORE CLUB에 표시되는 이미지가 이전에 바뀌어 보이던 부분을 바로잡기 위해 1/2번 이미지를 교체합니다.
    src: "https://i.postimg.cc/4NxVjgk7/IMG-9600.jpg",
    svgTheme: { col1: "#8BE9FF", col2: "#9BA8FF" },
  },
  {
    heading: "맞춤 보완",
    title: "CUSTOMIZING LAB 코칭 장면",
    body: "개인 과제 중심으로 수업 리듬을 다시 설계합니다.",
    src: "https://i.postimg.cc/j53SBGrb/DSC00739.jpg",
    svgTheme: { col1: "#C8F34A", col2: "#8BE9FF" },
  },
  {
    heading: "적응형 클래스",
    title: "Adaptive Move Class",
    body: "안정적인 진행으로 참여 경험을 먼저 확보합니다.",
    src: "https://i.postimg.cc/pXLz3Hbr/IMG-9669.png",
    svgTheme: { col1: "#F5D56B", col2: "#8BE9FF" },
  },
];

export interface PricingRow {
  label: string;
  composition: string;
  price: string;
  note: string;
}

export const PRICING_ROWS: PricingRow[] = [
  { label: "주 1회", composition: "월 4회 · 50분", price: "15만원", note: "회당 37,500원" },
  { label: "주 2회", composition: "월 8회 · 50분", price: "20만원", note: "가장 인기 · 회당 25,000원" },
  { label: "주 3회", composition: "월 12회 · 50분", price: "24만원", note: "회당 20,000원" },
  { label: "체험 수업", composition: "1회 · 50분", price: "15,000원", note: "정가 30,000원에서 50% 할인" },
];

export interface FAQItem {
  q: string;
  a: string;
}

export const FAQ_ITEMS: FAQItem[] = [
  {
    q: "일반 체육학원과 어떤 점이 다른가요?",
    a: "종목 수를 늘리는 방식보다, 움직임의 기본-보완-적용 흐름을 교육 구조로 운영합니다.",
  },
  {
    q: "운동 경험이 거의 없어도 시작할 수 있나요?",
    a: "가능합니다. 현재 시작점에서 첫 과제를 맞추고 수업 루틴에 자연스럽게 적응하도록 설계합니다.",
  },
  {
    q: "체험 후 어떤 기준으로 반을 정하나요?",
    a: "연령, 참여 리듬, 과제 수행 방식, 보호자 목표를 함께 보고 클래스를 제안합니다.",
  },
  {
    q: "느린 속도의 아이도 참여할 수 있나요?",
    a: "Adaptive Move Class에서 속도와 과제를 조정하며 안정적인 참여 경험을 먼저 만듭니다.",
  },
  {
    q: "왜 12주 단위로 운영하나요?",
    a: "변화를 관찰하고 다음 목표를 제안하기에 가장 현실적인 학습 단위이기 때문입니다.",
  },
  {
    q: "리포트에는 어떤 내용이 담기나요?",
    a: "집중-반응-협응-적용 장면을 중심으로 관찰 기록과 코치 코멘트가 제공됩니다.",
  },
  {
    q: "주말 프로그램만 참여할 수 있나요?",
    a: "가능합니다. 토요일 체험/이벤트와 일요일 특강은 별도 신청으로 운영합니다.",
  },
  {
    q: "결석이나 보강은 어떻게 되나요?",
    a: "센터 운영 기준에 따라 보강 가능한 회차를 상담 시 안내해 드립니다.",
  },
  {
    q: "복장은 어떻게 준비하면 되나요?",
    a: "편한 운동복과 실내 운동화를 권장합니다. 물병은 개별 준비해 주세요.",
  },
];

export const PARKING_INFO = "센터 건물 지상 주차장 이용이 가능합니다.";

export const AGE_OPTIONS = ["미취학 (6-7세)", "초등 저학년 (1-3학년)", "초등 고학년 (4-6학년)"] as const;
