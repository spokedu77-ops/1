import { SPOKEDU_BASE_PATH } from './site';
import type { HomeMediaKey } from './home-media';
import { recordsCaseImageBySlug, SPOKEDU_IMAGES } from './images';
import type { ProgramSlug } from './programs-catalog';

export type CaseType = '기관 파견' | '개인·소그룹' | '행사형' | '강사교육';
export type RelatedProgramSlug = ProgramSlug;

export type CaseData = {
  title: string;
  slug: string;
  institution: string;
  program: string;
  target: string;
  location: string;
  date: string;
  summary: string;
  highlight: string;
  mediaKey: HomeMediaKey;
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
    summary: '키움센터 정규수업에서 SPOMOVE를 운영한 사례입니다.',
    highlight: '보고, 선택하고, 반응하는 에듀테크 체육수업',
    mediaKey: 'proofClass',
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
    summary: '리듬·반응 중심 활동으로 참여도를 높인 키움센터 수업입니다.',
    highlight: '리듬과 타이밍을 몸으로 경험한 반응형 수업',
    mediaKey: 'proofCenter',
    movementGoals: ['리듬 기반 민첩 반응', '규칙 전환 대응', '협동 플레이'],
    educationPoints: ['소그룹 협동 미션으로 참여 편차 완화', '음악·리듬 신호를 활용한 몰입 유도'],
    images: [
      {
        src: recordsCaseImageBySlug['dongjak-rhythm'].src,
        alt: recordsCaseImageBySlug['dongjak-rhythm'].alt,
        title: '리듬챌린지 협동 활동',
      },
    ],
    relatedProgram: 'spomove',
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
    summary: '지역아동센터 원데이 행사형 체육 프로그램 운영 사례입니다.',
    highlight: '협동 미션·놀이 중심 원데이',
    mediaKey: 'proofCommunity',
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
    summary: '방학 시즌 체육·예체능 결합 캠프 운영 사례입니다.',
    highlight: '체육과 예체능을 결합한 초등 방학캠프',
    mediaKey: 'proofLounge',
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
    summary: '공공 행사 체험 부스에서 단기 회전형 체육 콘텐츠를 운영한 사례입니다.',
    highlight: '아이들이 직접 참여한 체험형 체육 콘텐츠',
    mediaKey: 'proofEvent',
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

export function getCaseBySlug(slug: string) {
  return cases.find((item) => item.slug === slug);
}

export const recordsFeaturedCaseSlugs = [
  'yangcheon-spomove',
  'dongjak-rhythm',
  'dasarang-oneday',
  'playz-camp',
  'seodaemun-event-booth',
] as const;
