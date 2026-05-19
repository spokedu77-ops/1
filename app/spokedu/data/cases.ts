import type { LinkCard, ProofItem } from './content';
import { SPOKEDU_BASE_PATH } from './content';
import { recordsCaseImageBySlug, SPOKEDU_IMAGES } from './images';

export type CaseType = '기관 파견' | '개인·소그룹' | '행사형' | '강사교육';
export type RelatedProgramSlug =
  | 'spomove'
  | 'paps'
  | 'oneday-event'
  | 'camp'
  | 'play-class'
  | 'curriculum-content'
  | 'play-pe'
  | 'new-sports'
  | 'funstick'
  | 'curriculum-package';

export type CaseData = {
  title: string;
  slug: string;
  institution: string;
  program: string;
  target: string;
  location: string;
  date: string;
  summary: string;
  movementGoals: string[];
  educationPoints: string[];
  images: Array<{ src: string; alt: string; title: string }>;
  relatedProgram: RelatedProgramSlug;
  tags: string[];
  type: CaseType;
  href: string;
};

export const cases: CaseData[] = [
  {
    title: '양천거점형키움센터 SPOMOVE',
    slug: 'yangcheon-spomove',
    institution: '양천거점형키움센터',
    type: '기관 파견',
    program: 'SPOMOVE',
    target: '초등 저학년~고학년',
    location: '서울 양천구',
    date: '2025-11',
    summary: '기관 맞춤형 에듀테크 체육 운영으로 반응·집중 경험을 강화한 사례입니다.',
    movementGoals: ['시각 자극 기반 반응속도', '집중 전환', '방향 전환 타이밍'],
    educationPoints: ['스테이션 회전 운영으로 대기 최소화', '난이도 단계화로 저/고학년 혼합 운영'],
    images: [
      {
        src: recordsCaseImageBySlug['yangcheon-spomove'].src,
        alt: recordsCaseImageBySlug['yangcheon-spomove'].alt,
        title: 'SPOMOVE 운영 장면',
      },
    ],
    relatedProgram: 'spomove',
    tags: ['SPOMOVE', '키움센터', '기관파견'],
    href: `${SPOKEDU_BASE_PATH}/cases/yangcheon-spomove`,
  },
  {
    title: '동작거점형키움센터 리듬챌린지',
    slug: 'dongjak-rhythm',
    institution: '동작거점형키움센터',
    type: '기관 파견',
    program: '리듬챌린지',
    target: '초등 저학년~중학년',
    location: '서울 동작구',
    date: '2025-10',
    summary: '협동·반응 중심 활동으로 또래 참여도를 높인 운영 사례입니다.',
    movementGoals: ['리듬 기반 민첩 반응', '규칙 전환 대응', '협동 플레이'],
    educationPoints: ['소그룹 협동 미션으로 참여 편차 완화', '음악·리듬 신호를 활용한 몰입 유도'],
    images: [
      {
        src: recordsCaseImageBySlug['dongjak-rhythm'].src,
        alt: recordsCaseImageBySlug['dongjak-rhythm'].alt,
        title: '리듬챌린지 협동 활동',
      },
    ],
    relatedProgram: 'new-sports',
    tags: ['리듬', '협동', '키움센터'],
    href: `${SPOKEDU_BASE_PATH}/cases/dongjak-rhythm`,
  },
  {
    title: '다사랑영등포지역아동센터 원데이',
    slug: 'dasarang-oneday',
    institution: '다사랑영등포지역아동센터',
    program: '원데이 체육행사',
    target: '초등 전학년 혼합',
    location: '서울 영등포구',
    date: '2025-09',
    summary: '기관 행사형 프로그램으로 단시간 몰입과 협동 경험을 설계한 사례입니다.',
    movementGoals: ['협동 기반 팀 미션', '순환형 체력 활동', '도전·성취 경험'],
    educationPoints: ['행사 시간표에 맞춘 1일형 구성', '학년 혼합 편성에서도 안전 동선 유지'],
    images: [
      {
        src: recordsCaseImageBySlug['dasarang-oneday'].src,
        alt: recordsCaseImageBySlug['dasarang-oneday'].alt,
        title: '원데이 체육행사 운영',
      },
    ],
    relatedProgram: 'oneday-event',
    tags: ['원데이', '행사형', '지역아동센터'],
    type: '행사형',
    href: `${SPOKEDU_BASE_PATH}/cases/dasarang-oneday`,
  },
  {
    title: 'PLAYZ Lounge 방학캠프',
    slug: 'playz-camp',
    institution: 'PLAYZ Lounge',
    type: '행사형',
    program: '방학캠프',
    target: '초등 저학년~고학년',
    location: '서울 강동구',
    date: '2025-08',
    summary: '방학 시즌 집중형 캠프로 체육과 예체능 결합 운영을 진행한 사례입니다.',
    movementGoals: ['기본 체력 루틴 형성', '협동 활동 강화', '장시간 활동 적응'],
    educationPoints: ['캠프형 일과표 기반 몰입 운영', '체육+예체능 결합으로 참여 동기 확장'],
    images: [
      {
        src: recordsCaseImageBySlug['playz-camp'].src,
        alt: recordsCaseImageBySlug['playz-camp'].alt,
        title: '방학캠프 팀 활동',
      },
    ],
    relatedProgram: 'camp',
    tags: ['방학캠프', '집중운영', '복합프로그램'],
    href: `${SPOKEDU_BASE_PATH}/cases/playz-camp`,
  },
  {
    title: '서대문형무소 어린이날 체험 부스',
    slug: 'seodaemun-event-booth',
    institution: '서대문형무소 어린이날 행사',
    type: '행사형',
    program: '체험형 부스',
    target: '어린이 가족 단위 참여',
    location: '서울 서대문구',
    date: '2025-05',
    summary: '공공 공간 연계 체험형 콘텐츠로 단시간 회전 운영을 진행한 사례입니다.',
    movementGoals: ['순간 반응 놀이', '가족 협동 미션', '기초 움직임 체험'],
    educationPoints: ['부스 회전율 중심 운영 설계', '처음 참여하는 아동도 즉시 참여 가능한 룰 구성'],
    images: [
      {
        src: recordsCaseImageBySlug['seodaemun-event-booth'].src,
        alt: recordsCaseImageBySlug['seodaemun-event-booth'].alt,
        title: '어린이날 체험 부스',
      },
    ],
    relatedProgram: 'oneday-event',
    tags: ['공공행사', '체험부스', '어린이날'],
    href: `${SPOKEDU_BASE_PATH}/cases/seodaemun-event-booth`,
  },
];

export const dispatchCases = cases
  .filter((item) => item.type === '기관 파견' || item.type === '행사형')
  .map((item) => item.title);

export const caseArchiveCards = cases;

export function getCaseBySlug(slug: string) {
  return cases.find((item) => item.slug === slug);
}

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
  ...cases.slice(0, 6).map((item) => ({
    title: item.title,
    description: item.summary,
    imageSlot: `records-${item.slug}`,
    imageAlt: item.images[0]?.alt ?? `${item.title} 이미지`,
    imageSrc: item.images[0]?.src,
  })),
];

export const operationalCaseLinks = [
  { label: '수업 사례 아카이브', href: `${SPOKEDU_BASE_PATH}/cases` },
  { label: '월간 운영 기록', href: `${SPOKEDU_BASE_PATH}/monthly` },
  { label: '현장기록 메인', href: `${SPOKEDU_BASE_PATH}/records` },
] as const;

export const recordsProofSummaryAreas = [
  '스포키듀 LAB',
  '개인·소그룹 수업',
  '기관 파견 수업',
  '원데이 체육행사',
  '방학캠프',
  '월간 스포키듀 기록',
  '커리큘럼 콘텐츠화',
] as const;

export const recordsFeaturedCaseSlugs = [
  'yangcheon-spomove',
  'dongjak-rhythm',
  'dasarang-oneday',
  'playz-camp',
  'seodaemun-event-booth',
] as const;
