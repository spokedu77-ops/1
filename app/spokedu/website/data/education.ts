import { educationHubPage } from '../../data/education-hub';
import { SPOKEDU_IMAGES } from '../../data/images';

const lineup = educationHubPage.operating.lineup;
const program = (id: string) => lineup.find(item => item.id === id)!;

/** Six operating categories; constituent activities stay inside the custom class. */
export const educationPrograms = [
  { ...program('spomove'), badge: '시지각 움직임 교육', description: '화면의 시각정보를 인식하고 반응을 선택해 움직임으로 수행하는 시지각·인지·운동 통합 교육입니다.', application: '색상·위치 반응 · 선택반응 · 복합 움직임', image: SPOKEDU_IMAGES.programs.spomoveClassConnected.src },
  { ...program('monthly-sports'), badge: '정기수업 · 방과후', description: '다양한 스포츠 종목을 경험하며 기본운동기술에서 종목별 기술과 게임 활동으로 단계적으로 확장합니다.', application: '구기 스포츠 · 라켓 스포츠 · 뉴스포츠', image: SPOKEDU_IMAGES.home.fieldEditorialCaseGeneral.src },
  {
    id: 'inclusive', name: '특수·포용 체육',
    badge: '개별화 · 통합교육',
    description: '학생별 운동 수행 수준과 과제 이해 정도에 맞춰 활동의 난이도와 지도 방식을 조정합니다.',
    application: '기본 움직임 · 조작운동 · 협동 활동',
    use: ['통합반', '단계별 활동'],
    details: {
      intro: '대상 특성과 필요한 지원 범위를 먼저 확인해 가능 여부와 운영 방식을 안내합니다.',
      recommendedFor: ['특수학급', '발달지연·느린학습자', '통합 체육수업'],
      activities: ['규칙 조정', '수행 속도 조정', '단계별 움직임'],
    },
    image: '/images/spokedu/records/donghaeng-special-pe.jpg',
  },
  { ...program('mini-olympics'), badge: '행사 · 스페셜 클래스', description: '스포츠 미션과 협동 활동을 하나의 행사로 연결해 참여자가 함께 도전하는 체육 프로그램입니다.', application: '팀별 미션 · 협동 경기 · 릴레이', image: '/images/spokedu/records/shinwol-integrated-pe.jpg' },
  { ...program('custom-booth'), name: '스포츠 체험 부스', badge: '축제 · 공공행사', description: '행사의 참여 규모와 이동 동선에 맞춰 다양한 스포츠 체험 활동을 구성하고 운영합니다.', application: '스포츠 체험존 · 순환형 미션 · 참여형 활동', image: '/images/spokedu/records/seodaemun-event-booth.jpg' },
  {
    id: 'custom-class', name: '기관 맞춤 프로그램',
    badge: '기관별 맞춤 운영',
    description: '기관의 교육 목적과 운영 환경에 맞춰 스포츠·놀이·움직임 활동을 필요한 방식으로 조합합니다.',
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

export function getEducationProgram(id: string | null) {
  return educationPrograms.find(item => item.id === id);
}

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
