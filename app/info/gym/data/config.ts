/**
 * 체육관 수업(info/gym) 랜딩 페이지 설정
 * public/info/data/config.js와 동기화 가능
 */

export const GYM_CONFIG = {
  center: {
    name: 'SPOKEDU LAB',
    tagline: '',
    address: '서울시 강동구 성내동 430-2, 7층 2호',
    hours: '평일 13:00–20:00 / 토 09:00–20:00',
    privacyUrl: 'javascript:void(0)',
  },
  phoneParts: ['010', '4437', '9294'] as [string, string, string],
  kakao: {
    webUrl: 'http://pf.kakao.com/_VGWxeb/chat',
    deepLink: '',
  },
  leadEndpoint:
    'https://script.google.com/macros/s/AKfycbwja8ZzKpyyNuRuPoBz6Mkp_SzHf0Bh9rGraip3GnHwPicOhadsZaoTYThcnAa_5OBfnw/exec',
} as const;

/** 주차 안내 문구 */
export const PARKING_INFO = '지상 주차장 이용 가능합니다.';

/** 강사 프로필 (선생님 소개·사진용) */
export interface Instructor {
  id: string;
  name: string;
  tag: string;
  photo?: string;
  badges: string[];
  desc: string;
}

export const INSTRUCTORS: Instructor[] = [
  {
    id: 'a',
    name: '수석 연구원',
    tag: '연세대학교 체육교육학 석사',
    badges: ['지도 경력 5년 차', '유소년스포츠지도사', '자전거·기초체력 전문'],
    desc: '아이들의 눈높이에서 공감하며, 두려움을 극복하고 확실한 성취감을 느낄 수 있도록 섬세하게 지도합니다.',
  },
  {
    id: 'b',
    name: '책임 강사',
    tag: '체육학 전공',
    badges: ['실무 경력 4년 차', '생활스포츠지도사', '줄넘기·인라인 전문'],
    desc: '유아동 체육 실무 경험을 바탕으로 낯가림이 심한 아이들도 금방 마음을 열고 뛰어놀 수 있게 만듭니다.',
  },
  {
    id: 'c',
    name: '전임 강사',
    tag: '아동 체육 지도 전공',
    badges: ['아동 발달 센터 경력', '심리운동사 2급', '구기종목·인지체육'],
    desc: '행동 발달에 대한 전문적인 이해를 바탕으로, 단순 체육을 넘어 스스로 생각하는 힘을 길러줍니다.',
  },
];

/** 수업 후기 */
export interface Review {
  id: string;
  text: string;
  who: string;
  course: string;
  avatar: string;
}

export const REVIEWS: Review[] = [
  {
    id: '1',
    text: '"동네 학원에 보내면 아이가 뒤처질까 봐 걱정이었는데, 소그룹 레벨링과 12주 커리큘럼으로 아이가 매주 체육 시간만 기다려요."',
    who: '초등 2학년 학부모',
    course: '기초 움직임 + 룰게임',
    avatar: '👩',
  },
  {
    id: '2',
    text: '"50분 루틴이 잡히니까 집에서도 "오늘은 뭐 했어?" 말걸기가 쉬워요. 성장 리포트 보고 다음 목표 이야기하는 게 좋아요."',
    who: '유아 6세 학부모',
    course: '놀이체육(기초발달)',
    avatar: '👨',
  },
  {
    id: '3',
    text: '"영어체육이랑 생활체육 같이 들으니까 아이가 체육 시간만 기다리더라고요. 선생님들이 연령에 맞게 잘 이끌어 주세요."',
    who: '초등 4학년 학부모',
    course: '영어체육 · 생활체육',
    avatar: '👩',
  },
];

/** 슬라이드 (사진/영상) */
export interface SlideItem {
  src: string | null;
  svgTheme: { col1: string; col2: string };
  title: string;
  heading: string;
  body: string;
  subtitle: string;
  note: string;
}

export const SLIDES_DATA: SlideItem[] = [
  {
    src: 'https://i.postimg.cc/fTCDRxtD/daunlodeu.jpg',
    svgTheme: { col1: '#C8F34A', col2: '#8BE9FF' },
    title: '공간/안전',
    heading: '안전 동선 · 공간 구성',
    body: '활동 구역/대기 구역 분리 · 정원 운영 · 규범 루틴',
    subtitle: '안전 동선 · 정원 운영 · 규범 루틴',
    note: '수업 환경',
  },
  {
    src: null,
    svgTheme: { col1: '#8BE9FF', col2: '#C8F34A' },
    title: '수업 구조',
    heading: '50분 정규수업',
    body: 'Check-in → Warm-up → Skill(FMS) → Game → Wrap-up',
    subtitle: "50분 안에 '학습 루틴' 완결",
    note: '수업 흐름',
  },
  {
    src: 'https://i.postimg.cc/Qd7mqqpY/20250303-101124.jpg',
    svgTheme: { col1: '#FFC75A', col2: '#8BE9FF' },
    title: '멀티스포츠',
    heading: '게임 기반 멀티스포츠',
    body: '규칙 이해 · 역할 수행 · 협동/커뮤니케이션',
    subtitle: "종목 '경험'이 아니라 '역량'으로 남게",
    note: '게임 기반',
  },
  {
    src: null,
    svgTheme: { col1: '#C8F34A', col2: '#8BE9FF' },
    title: '분기 단위',
    heading: '12주(1분기) 운영',
    body: '적응 → 누적 → 중간점검 → 분기 리포트',
    subtitle: "'매주 새로움'보다 '누적 학습'",
    note: '12주 설계',
  },
  {
    src: 'https://i.postimg.cc/DzFrP3fw/20260301-215543.png',
    svgTheme: { col1: '#8BE9FF', col2: '#C8F34A' },
    title: '리포트',
    heading: '성장 리포트(샘플)',
    body: '관찰 → 기준표 → 다음 목표',
    subtitle: '설명 가능한 운영(학원 신뢰의 핵심)',
    note: '분기 리포트',
  },
  {
    src: 'https://i.postimg.cc/LXWg7cSc/gangdong-gu-bogeonso-biman-yebang-chelyeoghyangsang-sueob-9.jpg',
    svgTheme: { col1: '#C8F34A', col2: '#8BE9FF' },
    title: '코칭',
    heading: "피드백은 '동작'이 아니라 '학습'이다",
    body: '관찰 → 짧은 피드백 → 재시도 → 정리',
    subtitle: "아이의 '재시도'를 설계",
    note: '코칭 방식',
  },
];

/** 시간표 슬롯 */
export type SlotStatus = 'open' | 'limited' | 'wait';

export interface ScheduleSlot {
  id: string;
  day: string;
  time: string;
  age: string;
  title: string;
  status: SlotStatus;
}

export const SLOTS: ScheduleSlot[] = [
  { id: 'mon-1700-e13', day: '월', time: '17:00', age: '초등(1–3)', title: '기초 움직임 + 룰게임', status: 'open' },
  { id: 'wed-1700-e13', day: '수', time: '17:00', age: '초등(1–3)', title: '반응·협응 + 미션', status: 'limited' },
  { id: 'fri-1700-e46', day: '금', time: '17:00', age: '초등(4–6)', title: '멀티스포츠 통합', status: 'open' },
  { id: 'sat-1000-k57', day: '토', time: '10:00', age: '유아(5–7)', title: '놀이체육(기초발달)', status: 'open' },
  { id: 'sat-1100-e13', day: '토', time: '11:00', age: '초등(1–3)', title: '기초 + 게임전개', status: 'wait' },
];

export const DAYS_ORDER = ['월', '화', '수', '목', '금', '토', '일'] as const;

/** 운영시간: 평일 13:00 시작, 토 09:00 시작, 모두 20:00까지 */
export const SCHEDULE_OPERATING_HOURS = [
  { day: '월', start: '13:00', end: '20:00', label: '평일' },
  { day: '화', start: '13:00', end: '20:00', label: '평일' },
  { day: '수', start: '13:00', end: '20:00', label: '평일' },
  { day: '목', start: '13:00', end: '20:00', label: '평일' },
  { day: '금', start: '13:00', end: '20:00', label: '평일' },
  { day: '토', start: '09:00', end: '20:00', label: '토요일' },
] as const;

/** 성장 리포트 메트릭 (샘플) */
export interface ReportMetric {
  key: string;
  value: number;
}

export const REPORT_METRICS: ReportMetric[] = [
  { key: 'Landing Stability', value: 72 },
  { key: 'Balance', value: 66 },
  { key: 'Reaction', value: 70 },
  { key: 'Rule Compliance', value: 78 },
  { key: 'Team Play', value: 64 },
  { key: 'Transfer (Apply)', value: 58 },
];

/** 가격 행 */
export interface PricingRow {
  label: string;
  composition: string;
  price: string;
  note: string;
}

export const PRICING_ROWS: PricingRow[] = [
  { label: '주 1회', composition: '월 4회 · 50분', price: '16만원', note: '입문/병행 추천' },
  { label: '주 2회', composition: '월 8회 · 50분', price: '24만원', note: '루틴 형성/전이 강화' },
  { label: '주 3회', composition: '월 12회 · 50분', price: '29만원', note: '집중 과정' },
  { label: '체험 수업', composition: '1회 · 50분', price: '30,000원', note: '레벨 진단 + 반 추천' },
];

/** 12주 커리큘럼 주차별 */
export interface CurriculumWeek {
  week: number;
  title: string;
  subtitle: string;
}

export const CURRICULUM_WEEKS: CurriculumWeek[] = [
  { week: 1, title: '루틴 정착', subtitle: '규칙·안전·공간 적응' },
  { week: 2, title: '기본 패턴', subtitle: '점프·착지·정지' },
  { week: 3, title: '협응/리듬', subtitle: '타이밍·반응' },
  { week: 4, title: '기초 게임', subtitle: '룰 이해·역할' },
  { week: 5, title: '패스/캐치', subtitle: '핸들링 전이' },
  { week: 6, title: '중간 점검', subtitle: '코칭 포인트 재설정' },
  { week: 7, title: '공간 인지', subtitle: '마킹·빈공간' },
  { week: 8, title: '미니 게임', subtitle: '전환/협력' },
  { week: 9, title: '전략 요소', subtitle: '간단 전술' },
  { week: 10, title: '대인 상황', subtitle: '1v1·2v2' },
  { week: 11, title: '팀 게임', subtitle: '역할·소통' },
  { week: 12, title: '분기 리포트', subtitle: '성장 요약+다음 목표' },
];

/** FAQ */
export interface FAQItem {
  q: string;
  a: string;
}

export const FAQ_ITEMS: FAQItem[] = [
  {
    q: '왜 12주(1분기)가 최소 단위인가요?',
    a: '기초 움직임과 규칙 적응은 "한두 번의 경험"으로 고정되지 않습니다. 12주는 적응–누적–중간점검–리포트까지 교육 흐름을 완결하기 위한 최소 단위입니다.',
  },
  {
    q: '실시간 예약/마감은 없나요?',
    a: '없습니다. 한국 학원 환경에서는 정원 안정화와 반 운영이 더 중요합니다. 선호 시간 접수 후 운영팀이 연락드려 반 편성과 확정을 안내합니다.',
  },
  {
    q: '운동을 싫어하거나 낯가림이 있어도 가능한가요?',
    a: "가능합니다. 스포키듀는 '기술부터'가 아니라 '경험/루틴부터' 시작합니다. 작은 성공을 반복하도록 과제 난이도와 피드백을 설계합니다.",
  },
  {
    q: '보강/환불은 어떻게 운영되나요?',
    a: '학원 운영 규정 및 관련 기준에 따라 처리합니다. 정원/시간표/안전을 함께 고려하며, 상세 기준은 등록 시 문서로 안내합니다.',
  },
];

/** 연령 옵션 (폼/필터) */
export const AGE_OPTIONS = ['유아(5–7)', '초등(1–3)', '초등(4–6)'] as const;
