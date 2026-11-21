import { educationHubPage } from '../../data/education-hub';
import { SPOKEDU_IMAGES } from '../../data/images';

const lineup = educationHubPage.operating.lineup;
const program = <Id extends (typeof lineup)[number]['id']>(id: Id) => ({ ...lineup.find(item => item.id === id)!, id });

/** Six operating categories; constituent activities stay inside the custom class. */
export const educationPrograms = [
  { ...program('spomove'), badge: '시지각 움직임 교육', description: '화면의 색과 위치에 반응하며 시지각·인지·움직임을 함께 기릅니다.', application: '색상·위치 반응 · 선택반응 · 복합 움직임', image: SPOKEDU_IMAGES.programs.spomoveClassConnected.src },
  { ...program('monthly-sports'), badge: '정기수업 · 방과후', description: '다양한 종목을 경험하며 기본 동작부터 스포츠 게임까지 배웁니다.', application: '구기 스포츠 · 라켓 스포츠 · 뉴스포츠', image: SPOKEDU_IMAGES.home.fieldEditorialCaseGeneral.src },
  {
    id: 'inclusive', name: '특수·포용 체육',
    badge: '개별화 · 통합교육',
    description: '학생별 수행 수준에 맞춰 활동 난이도와 지도 방식을 조정합니다.',
    application: '기본 움직임 · 조작운동 · 협동 활동',
    use: ['통합반', '단계별 활동'],
    details: {
      intro: '대상 특성과 필요한 지원 범위를 먼저 확인해 가능 여부와 운영 방식을 안내합니다.',
      recommendedFor: ['특수학급', '발달지연·느린학습자', '통합 체육수업'],
      activities: ['규칙 조정', '수행 속도 조정', '단계별 움직임'],
    },
    image: '/images/spokedu/records/donghaeng-special-pe.jpg',
  },
  { ...program('mini-olympics'), badge: '행사 · 스페셜 클래스', description: '팀별 스포츠 미션과 협동 경기로 함께 도전하는 체육행사입니다.', application: '팀별 미션 · 협동 경기 · 릴레이', image: '/images/spokedu/records/shinwol-integrated-pe.jpg' },
  { ...program('custom-booth'), name: '스포츠 체험 부스', badge: '축제 · 공공행사', description: '행사 규모와 동선에 맞춰 다양한 스포츠 체험 부스를 운영합니다.', application: '스포츠 체험존 · 순환형 미션 · 참여형 활동', image: '/images/spokedu/records/seodaemun-event-booth.jpg' },
  {
    id: 'custom-class', name: '기관 맞춤 프로그램',
    badge: '기관별 맞춤 운영',
    description: '기관의 목적과 환경에 맞춰 스포츠·놀이·움직임을 조합합니다.',
    application: '교육 목적 · 활동 조합 · 운영 방식 협의',
    use: ['정기수업', '방학·특강', '원데이'],
    details: {
      intro: '기관의 대상·일정·공간과 운영 목적을 확인하고 필요한 활동을 조합합니다.',
      formats: ['정기수업', '방학특강', '원데이', '기관 행사'],
      activities: ['펑셔널 무브', '팀빌딩', '기초 조작활동', '협동 미션'],
    },
    image: '/images/spokedu/복지관_민첩성 놀이체육.jpg',
  },
] as const;

/** Presentation groups only; programs can be combined across operating formats. */
export const educationProgramGroups = [
  { id: 'regular', title: '정기·방과후 수업', description: '학기 일정에 맞춰 기본 움직임과 스포츠 활동을 이어갑니다. 정기수업과 방과후 환경에 맞게 회기별 활동을 구성합니다.', label: '학교·키움센터·방과후 운영', programIds: ['monthly-sports', 'spomove'] },
  { id: 'inclusive', title: '특수·포용 및 맞춤 체육', description: '참여자의 운동 수행 수준과 규칙 이해 정도를 고려합니다. 공간과 인원에 맞춰 난이도와 참여 방식을 조정합니다.', label: '특수학급·통합반·복지기관 운영', programIds: ['inclusive', 'custom-class'] },
  { id: 'events', title: '특강·캠프 및 행사', description: '하루 또는 단기 일정에 맞춰 스포츠 미션과 협동 활동을 구성합니다. 참여 규모와 이동 동선도 함께 고려합니다.', label: '기관 행사·축제·원데이 운영', programIds: ['mini-olympics', 'custom-booth'] },
] as const satisfies ReadonlyArray<{
  id: string;
  title: string;
  description: string;
  label: string;
  programIds: readonly (typeof educationPrograms)[number]['id'][];
}>;

export function getEducationProgram(id: string | null) {
  return educationPrograms.find(item => item.id === id);
}

export const educationOperatingSteps = [
  {
    "title": "상담 및 문의 접수",
    "icon": "assignment",
    "body": "기관의 교육 목적과 희망 일정, 참여 대상에 대한 상담을 시작합니다."
  },
  {
    "title": "교육 환경 확인",
    "icon": "location_on",
    "body": "참여 인원과 공간, 대상 특성 및 필요한 지원 범위를 확인합니다."
  },
  {
    "title": "일정·조건 협의",
    "icon": "calendar_month",
    "body": "교육 환경에 맞는 프로그램과 운영 형태, 일정 및 견적을 협의합니다."
  },
  {
    "title": "지도자·교구 준비",
    "icon": "groups",
    "body": "협의한 수업 구성에 맞춰 지도자 배정과 교구 준비를 진행합니다."
  },
  {
    "title": "첫 수업 운영",
    "icon": "play_arrow",
    "body": "준비한 활동으로 첫 수업을 진행하고 현장 상황에 맞춰 조정합니다."
  }
] as const;

export function educationProgramImageAlt(item: (typeof educationPrograms)[number]) {
  return item.id === 'custom-booth' ? 'SPOKEDU 행사 참여자 단체 사진' : `${item.name} 수업 현장`;
}

type ProgramModalContent = {
  summary: string;
  intro: string;
  activityLabel: string;
  activities: readonly string[];
  secondaryLabel: string;
  secondary: string;
  note?: string;
};

/** Display categories are explicit: operating formats are never inferred as audiences. */
export const educationProgramModalContent: Record<string, ProgramModalContent> = {
  spomove: {
    summary: '시각정보와 실제 움직임을 연결하는 교육',
    intro: '화면에 제시되는 색상과 위치 등의 시각정보를 인식하고 주어진 규칙에 맞춰 반응을 선택한 뒤 실제 움직임으로 수행합니다.',
    activityLabel: '주요 활동', activities: ['색상·위치 반응', '선택반응 과제', '규칙에 따른 움직임', '복합 시각자극 활동'],
    secondaryLabel: '운영 형태', secondary: '기관 정기수업 일부 · 체험형 활동 · 특강 등',
  },
  'monthly-sports': {
    summary: '기본 동작부터 게임으로 이어지는 스포츠 교육',
    intro: '여러 스포츠 종목을 회차별로 구성하고 기본 동작에서 종목별 기술과 게임 활동으로 이어지는 수업입니다.',
    activityLabel: '주요 활동', activities: ['기본운동기술', '구기 스포츠', '라켓 스포츠', '뉴스포츠'],
    secondaryLabel: '운영 형태', secondary: '정기수업 · 방과후 · 월간 테마수업', note: '종목과 회기 구성은 기관의 운영 계획에 따라 달라질 수 있습니다.',
  },
  inclusive: {
    summary: '학생별 수행 수준에 맞춰 조정하는 체육교육',
    intro: '학생별 운동 수행 수준과 과제 이해 정도를 고려해 활동의 규칙과 난이도를 조정하는 맞춤형 체육교육입니다.',
    activityLabel: '주요 활동', activities: ['기본 이동운동', '조작운동 활동', '시지각 움직임', '협동·참여 활동'],
    secondaryLabel: '교육 대상', secondary: '특수교육 대상 학생 · 느린학습자 · 통합교육 참여 아동 등', note: '실제 지원 범위는 대상과 운영 환경을 확인해 협의합니다.',
  },
  'mini-olympics': {
    summary: '함께 도전하는 단체 참여형 체육행사',
    intro: '팀별 스포츠 미션과 협동 활동을 연결해 단체 참여형 체육행사로 구성하는 프로그램입니다.',
    activityLabel: '주요 활동', activities: ['팀별 스포츠 미션', '릴레이', '협동 경기', '기록형 활동'],
    secondaryLabel: '운영 형태', secondary: '기관 행사 · 캠프 · 원데이 · 특별수업',
  },
  'custom-booth': {
    summary: '행사 동선에 맞춰 구성하는 스포츠 체험',
    intro: '축제나 행사에서 참여자가 여러 스포츠 활동을 체험할 수 있도록 프로그램과 이동 동선을 구성합니다.',
    activityLabel: '주요 활동', activities: ['스포츠 체험존', '종목별 체험 활동', '순환형 미션', '참여형 스포츠 부스'],
    secondaryLabel: '운영 형태', secondary: '학교 축제 · 지역 행사 · 공공기관 행사',
  },
  'custom-class': {
    summary: '기관 조건에 맞춰 활동을 조합하는 운영 서비스',
    intro: '기관의 대상·인원·공간·운영 목적을 확인하고 필요한 교육 프로그램과 활동을 조합하는 맞춤 운영 서비스입니다.',
    activityLabel: '구성 가능한 활동', activities: ['기본 움직임', '스포츠 활동', '놀이·협동 활동', 'SPOMOVE 등 시지각 움직임 활동'],
    secondaryLabel: '운영 방식', secondary: '정기수업 · 방학특강 · 원데이 · 기관 행사',
  },
};

export const educationReviews = [
  {
    "title": "\"느린 학습자도 소외되지 않는 진짜 교육\"",
    "body": "\"특수 아동이 함께 있는 통합반이라 외부 체육 강사를 쓰는 데 조심스러운 부분이 있었습니다. 하지만 스포키듀는 느린 학습자까지 고려한 난이도 조절과 참여 방식 설계를 통해, 모든 아이들이 각자의 수준에서 성취감을 느끼며 수업에 참여할 수 있도록 운영해주고 있습니다.\"",
    "author": "박○○ 센터장님",
    "organization": "지역 복지관 아동 발달센터"
  },
  {
    "title": "\"재미에만 머무르지 않고, 성장의 흐름이 보이는 수업입니다.\"",
    "body": "\"놀이체육이라고 해서 단순한 활동 중심 수업일 줄 알았는데, 스포키듀는 연간 커리큘럼 안에서 신체 기능 향상 목표를 체계적으로 반영해 운영해주셔서 훨씬 전문적으로 느껴졌습니다. 아이들도 즐겁게 참여하고, 기관 입장에서도 교육적 방향성이 분명해 만족도가 높았습니다.\"",
    "author": "김○○ 담당자님",
    "organization": "거점형 키움센터 담당자"
  },
  {
    "title": "\"공간과 인원에 꼭 맞게 수업을 정말 잘 맞춰주셨습니다.\"",
    "body": "\"장소가 넓지 않고 참여 인원도 매번 달라 운영이 쉽지 않았는데, 스포키듀는 현장 여건을 빠르게 파악한 뒤 그에 맞는 프로그램으로 자연스럽게 구성해주셨습니다. 공간이 달라도, 인원이 달라도 수업의 흐름이 무너지지 않도록 유연하게 운영해주셔서 매우 만족스러웠습니다.\"",
    "author": "이○○ 담당자님",
    "organization": "OO구 보건소 담당자"
  }
] as const;

export const educationComparison = [
  {
    "title": "핵심 커리큘럼",
    "operation": "연세대 체육전공자 전문성과 현장 데이터가 적용된 연간 커리큘럼",
    "criteria": "강사 개인의 경험 및 재량에 의존"
  },
  {
    "title": "강사 파견 기준",
    "operation": "체육 전공자 출신으로 스포키듀 교육과정을 이수한 전문 강사",
    "criteria": "검증 이력 없는 단기 프리랜서 혼용"
  },
  {
    "title": "결근·펑크 리스크",
    "operation": "부재 시 즉시 공유 후 운영진 투입으로 수업 공백 최소화",
    "criteria": "대부분 수업 진행 불가 및 휴강 처리"
  },
  {
    "title": "수업 진행 방식",
    "operation": "아이의 반응과 움직임을 설계해 몰입과 성장을 만드는 프로그램",
    "criteria": "단순 기구 놀이 및 시간 채우기식 체육"
  },
  {
    "title": "행정 서류 및 소통",
    "operation": "견적서·강사 이력서·범죄경력조회서 원스톱 지원 및 밀착 소통",
    "criteria": "서류 준비 지연 및 일회성 구두 전달"
  }
] as const;

export const educationFaq = [
  {
    "question": "비용은 어떻게 되나요?",
    "answer": "참여 대상과 인원, 장소, 일정 등 기관 조건을 확인한 뒤 맞춤 견적을 안내합니다."
  },
  {
    "question": "최소 계약 기간이 있나요?",
    "answer": "원데이·단기·정기수업 등 기관이 원하는 운영 형태에 따라 협의합니다."
  },
  {
    "question": "강사 교체 요청이 가능한가요?",
    "answer": "교체 요청 사유와 현장 상황을 확인한 뒤 기관과 운영 방안을 협의합니다."
  },
  {
    "question": "특수학급 아동이 포함된 통합반도 운영되나요?",
    "answer": "대상 특성과 필요한 지원 범위를 먼저 확인한 뒤 특수·포용 체육의 운영 가능 여부를 안내합니다."
  },
  {
    "question": "운영 가능한 지역이 어디인가요?",
    "answer": "희망 지역과 일정, 지도자 배정 및 출강 조건을 확인한 뒤 운영 가능 여부를 안내합니다."
  }
] as const;

/** Education card presentation; program IDs and modal content remain canonical above. */
export const educationProgramPresentation: Record<(typeof educationPrograms)[number]['id'], { audience: string; features: readonly string[]; example: string }> = {
  spomove: { audience: '학교 · 키움센터 · 복지기관', features: ['시각정보 인식', '선택반응', '실제 움직임'], example: '예시 · 화면의 색과 위치에 맞춰 움직이기' },
  'monthly-sports': { audience: '초중고 방과후 · 지역아동센터', features: ['기본운동기술', '종목별 활동', '게임 적용'], example: '예시 · 스틱과 공을 활용한 스포츠 게임' },
  inclusive: { audience: '특수학급 · 통합반 · 복지기관', features: ['규칙 조정', '개별 난이도', '함께 참여'], example: '예시 · 수행 수준에 맞춘 조작운동' },
  'mini-olympics': { audience: '학교 · 기관 행사 · 캠프', features: ['팀별 도전', '협동 경기', '단체 참여'], example: '예시 · 팀별 릴레이와 협동 미션' },
  'custom-booth': { audience: '학교 축제 · 지역 행사 · 공공기관', features: ['체험존 구성', '순환형 미션', '동선 설계'], example: '예시 · 여러 종목을 순환하는 체험 부스' },
  'custom-class': { audience: '학교 · 기관별 맞춤 운영', features: ['목적별 구성', '활동 조합', '환경별 조정'], example: '예시 · 기본 움직임과 팀빌딩 조합' },
};
