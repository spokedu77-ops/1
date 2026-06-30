import { SPOKEDU_BASE_PATH } from './site';
import type { HomeMediaKey } from './home-media';
import { recordsCaseImageBySlug } from './images';
import type { ProgramSlug } from './programs-catalog';
import type { CaseFilterId } from './cases-page';

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
  operationType: string;
  coreChallenge: string;
  cardSummary: string;
  filters: readonly Exclude<CaseFilterId, 'all'>[];
  ctaLabel: string;
  background: string;
  composition: string[];
  operationalMeaning: string;
  expansion: string;
  sceneCaption: string;
  mediaKey: HomeMediaKey;
  movementGoals: string[];
  educationPoints: string[];
  images: Array<{ src: string; alt: string; title: string; caption?: string }>;
  relatedProgram: RelatedProgramSlug;
  tags: string[];
  type: CaseType;
  href: string;
};

export const cases: CaseData[] = [
  {
    title: '양천거점형키움센터 SPOMOVE 정규수업',
    slug: 'yangcheon-spomove',
    institution: '양천거점형키움센터',
    type: '기관 파견',
    program: 'SPOMOVE',
    target: '초등 저학년',
    location: '서울 양천구',
    date: '2025-11',
    operationType: '정규수업',
    coreChallenge:
      '짧은 집중 시간 안에서 아이들이 화면 신호를 보고 몸으로 반응하는 경험 만들기',
    cardSummary:
      '색, 위치, 방향 신호를 활용해 보고 → 선택하고 → 움직이는 반응형 놀이체육 수업을 구성했습니다.',
    summary:
      '키움센터 정규 시간에 맞춰 SPOMOVE를 구성·운영한 기관 협업 사례입니다.',
    highlight: '보고, 선택하고, 반응하는 에듀테크 체육수업',
    background:
      '거점센터 정규 시간대에 저·고학년이 함께 참여하며, 짧은 블록 안에서도 화면 신호에 맞춰 움직일 수 있는 수업 구성이 필요했습니다.',
    composition: [
      '빔 화면 색·위치·방향 신호로 스테이션별 미션을 구성했습니다.',
      '스테이션 회전으로 대기 시간을 줄이고 참여 밀도를 유지했습니다.',
      '연령·수준에 따라 미션 난이도를 단계화해 혼합 학년을 운영했습니다.',
    ],
    operationalMeaning:
      '활동 후반으로 갈수록 규칙을 이해하고, 신호를 기다린 뒤 선택해 움직이는 흐름에 점차 익숙해졌습니다.',
    expansion:
      '동일한 스테이션 구조를 유지한 채 학기 단위 정규 운영·테마 교체로 확장할 수 있습니다.',
    sceneCaption: '빔 화면의 색 신호에 맞춰 아이들이 이동 방향을 선택하는 활동',
    mediaKey: 'programSpomove',
    movementGoals: ['시각 자극 기반 반응', '집중 전환', '방향 전환 타이밍'],
    educationPoints: ['스테이션 회전 운영', '난이도 단계화'],
    images: [
      {
        src: recordsCaseImageBySlug['yangcheon-spomove'].src,
        alt: recordsCaseImageBySlug['yangcheon-spomove'].alt,
        title: 'SPOMOVE 운영 장면',
        caption: '빔 화면의 색 신호에 맞춰 아이들이 이동 방향을 선택하는 활동',
      },
    ],
    relatedProgram: 'spomove',
    tags: ['SPOMOVE', '키움센터', '정규수업'],
    filters: ['regular'],
    ctaLabel: '운영 사례 보기',
    href: `${SPOKEDU_BASE_PATH}/cases/yangcheon-spomove`,
  },
  {
    title: '동작거점형키움센터 SPOMOVE 연계 수업',
    slug: 'dongjak-rhythm',
    institution: '동작거점형키움센터',
    type: '기관 파견',
    program: 'SPOMOVE 연계',
    target: '초등 저학년~중학년',
    location: '서울 동작구',
    date: '2025-10',
    operationType: '정규수업',
    coreChallenge:
      '거점센터에 모인 혼합 연령이 화면·리듬 신호에 맞춰 함께 반응할 수 있는 수업 흐름 만들기',
    cardSummary:
      '화면 신호와 리듬 활동을 연계해 보고 반응하는 수업을 구성하고, 소그룹 협동으로 참여 편차를 줄였습니다.',
    summary:
      '리듬·반응 중심 활동으로 거점센터 정규 시간에 맞춘 SPOMOVE 연계 수업을 운영한 사례입니다.',
    highlight: '리듬과 타이밍을 몸으로 경험한 반응형 수업',
    background:
      '정규 프로그램 시간에 연령대가 섞여 있어, 규칙 전환이 잦은 활동에서도 안전하게 참여할 수 있는 구조가 필요했습니다.',
    composition: [
      '화면 신호와 리듬 미션을 번갈아 배치해 집중 전환을 유도했습니다.',
      '소그룹 협동 미션으로 역할 분담과 참여 균형을 맞췄습니다.',
      '음악·리듬 신호로 활동 시작·전환 타이밍을 통일했습니다.',
    ],
    operationalMeaning:
      '수업 중반 이후에는 신호 변화에 맞춰 팀이 역할을 나누고 움직이는 패턴이 안정적으로 이어졌습니다.',
    expansion:
      '테마별 리듬 미션을 교체하며 동일 거점에서 분기 운영이 가능합니다.',
    sceneCaption: '화면 신호에 맞춰 소그룹이 역할을 나누며 움직이는 활동',
    mediaKey: 'programPaps',
    movementGoals: ['리듬 기반 반응', '규칙 전환 대응', '협동 플레이'],
    educationPoints: ['소그룹 협동 미션', '리듬 신호 활용'],
    images: [
      {
        src: recordsCaseImageBySlug['dongjak-rhythm'].src,
        alt: recordsCaseImageBySlug['dongjak-rhythm'].alt,
        title: 'SPOMOVE 연계 협동 활동',
        caption: '화면 신호에 맞춰 소그룹이 역할을 나누며 움직이는 활동',
      },
    ],
    relatedProgram: 'spomove',
    tags: ['SPOMOVE', '키움센터', '정규수업'],
    filters: ['regular'],
    ctaLabel: '수업 사례 보기',
    href: `${SPOKEDU_BASE_PATH}/cases/dongjak-rhythm`,
  },
  {
    title: '다사랑영등포지역아동센터 원데이 체육행사',
    slug: 'dasarang-oneday',
    institution: '다사랑영등포지역아동센터',
    program: '원데이 체육행사',
    target: '초등 전학년 혼합',
    location: '서울 영등포구',
    date: '2025-09',
    operationType: '원데이·행사',
    coreChallenge:
      '하루 일정 안에서 학년 혼합 아동이 안전하게 순환하며 협동 체육을 경험하게 만들기',
    cardSummary:
      '행사 시간표에 맞춘 협동 미션·순환형 활동으로 원데이 체육 프로그램을 구성했습니다.',
    summary:
      '지역아동센터 원데이 행사형 체육 프로그램을 기관 일정과 공간에 맞춰 운영한 사례입니다.',
    highlight: '협동 미션·놀이 중심 원데이',
    background:
      '센터 행사일에 전 학년이 한 공간을 공유해, 짧은 블록·명확한 동선이 필요했습니다.',
    composition: [
      '협동 팀 미션과 순환형 체력 활동을 교차 배치했습니다.',
      '학년 혼합 편성에 맞춰 난이도·역할을 이중으로 나눴습니다.',
      '행사 종료 시점까지 안전 동선을 유지하는 스테이션 배치를 적용했습니다.',
    ],
    operationalMeaning:
      '후반 블록에서도 팀 미션 규칙을 설명 없이 이어가는 흐름이 늘어나, 행사 진행이 매끄러워졌습니다.',
    expansion:
      '분기별 테마 원데이·정규 연계 프로그램으로 이어 설계할 수 있습니다.',
    sceneCaption: '팀 미션 규칙에 맞춰 순환하며 참여하는 원데이 활동',
    mediaKey: 'programPlay',
    movementGoals: ['협동 팀 미션', '순환형 체력 활동', '도전·성취 경험'],
    educationPoints: ['1일형 시간표 구성', '혼합 학년 안전 동선'],
    images: [
      {
        src: recordsCaseImageBySlug['dasarang-oneday'].src,
        alt: recordsCaseImageBySlug['dasarang-oneday'].alt,
        title: '원데이 체육행사 운영',
        caption: '팀 미션 규칙에 맞춰 순환하며 참여하는 원데이 활동',
      },
    ],
    relatedProgram: 'oneday-event',
    tags: ['원데이', '행사형', '지역아동센터'],
    type: '행사형',
    filters: ['oneday'],
    ctaLabel: '운영 사례 보기',
    href: `${SPOKEDU_BASE_PATH}/cases/dasarang-oneday`,
  },
  {
    title: '서울숲 PLAYZ Lounge 방학캠프',
    slug: 'playz-camp',
    institution: 'PLAYZ Lounge',
    type: '행사형',
    program: '방학캠프',
    target: '초등 저학년~고학년',
    location: '서울 강동구',
    date: '2025-08',
    operationType: '캠프',
    coreChallenge:
      '문화·체육 복합 공간에서 하루·다일 단위로 체육과 예체능을 자연스럽게 이어 붙이기',
    cardSummary:
      '캠프형 일과표로 체육·예체능 블록을 배치해 방학 몰입 프로그램을 운영했습니다.',
    summary:
      'PLAYZ Lounge 방학 시즌에 맞춘 체육·예체능 결합 캠프 운영 사례입니다.',
    highlight: '체육과 예체능을 결합한 방학 캠프',
    background:
      '방학 기간 집중 참여가 가능한 공간이었고, 장시간 일정에서도 활동 전환이 필요했습니다.',
    composition: [
      '오전·오후 블록별로 체육 루틴과 예체능 활동을 교차 배치했습니다.',
      '팀 단위 과제로 장시간 활동에서도 역할 전환을 유지했습니다.',
      '공간 동선을 고려해 실내·실외 활동을 분리 운영했습니다.',
    ],
    operationalMeaning:
      '캠프 후반에는 일과표 흐름을 스스로 예측하고 다음 블록 준비 동작이 빨라졌습니다.',
    expansion:
      '주제별 캠프(스포츠·예술) 패키지로 시즌 단위 반복 운영이 가능합니다.',
    sceneCaption: '캠프 일과에 맞춰 팀 활동으로 이어지는 체육 블록',
    mediaKey: 'programCamp',
    movementGoals: ['기본 체력 루틴', '협동 활동', '장시간 활동 적응'],
    educationPoints: ['캠프형 일과표', '체육+예체능 결합'],
    images: [
      {
        src: recordsCaseImageBySlug['playz-camp'].src,
        alt: recordsCaseImageBySlug['playz-camp'].alt,
        title: '방학캠프 팀 활동',
        caption: '캠프 일과에 맞춰 팀 활동으로 이어지는 체육 블록',
      },
    ],
    relatedProgram: 'camp',
    tags: ['방학캠프', '공간 협업', '복합프로그램'],
    filters: ['camp', 'space'],
    ctaLabel: '수업 사례 보기',
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
    operationType: '원데이·행사',
    coreChallenge:
      '공공·문화 공간 행사에서 처음 참여하는 아이도 짧은 시간 안에 체험을 완료하게 만들기',
    cardSummary:
      '회전형 체험 룰과 가족 협동 미션으로 어린이날 체육 부스를 구성·운영했습니다.',
    summary:
      '역사·문화 공간 행사 맥락에 맞춘 단기 회전형 체육 체험 부스 운영 사례입니다.',
    highlight: '즉시 참여 가능한 체험형 체육 콘텐츠',
    background:
      '행사장 특성상 참여 시간이 짧고, 가족 단위로 유입되는 흐름에 맞춘 부스 설계가 필요했습니다.',
    composition: [
      '3~5분 단위 회전형 체험 룰을 설계했습니다.',
      '가족 협동 미션으로 보호자·아이가 함께 참여하도록 구성했습니다.',
      '대기열 없이 다음 참여자가 바로 시작할 수 있는 동선을 유지했습니다.',
    ],
    operationalMeaning:
      '오후 시간대에도 체험 설명 없이 규칙을 따라 참여하는 가족 비율이 높아졌습니다.',
    expansion:
      '지자체·문화시설 행사 부스 패키지로 유사 공간에 적용할 수 있습니다.',
    sceneCaption: '행사 부스에서 가족 단위로 체험 미션에 참여하는 장면',
    mediaKey: 'programOneday',
    movementGoals: ['순간 반응 놀이', '가족 협동 미션', '기초 움직임 체험'],
    educationPoints: ['부스 회전율 중심 설계', '즉시 참여 룰'],
    images: [
      {
        src: recordsCaseImageBySlug['seodaemun-event-booth'].src,
        alt: recordsCaseImageBySlug['seodaemun-event-booth'].alt,
        title: '어린이날 체험 부스',
        caption: '행사 부스에서 가족 단위로 체험 미션에 참여하는 장면',
      },
    ],
    relatedProgram: 'oneday-event',
    tags: ['공공행사', '체험부스', '공간 협업'],
    filters: ['oneday', 'space'],
    ctaLabel: '사례 자세히 보기',
    href: `${SPOKEDU_BASE_PATH}/cases/seodaemun-event-booth`,
  },
];

export const dispatchCases = cases
  .filter((item) => item.type === '기관 파견' || item.type === '행사형')
  .map((item) => item.title);

export function getCaseBySlug(slug: string) {
  return cases.find((item) => item.slug === slug);
}

export function caseMatchesFilter(item: CaseData, filter: CaseFilterId): boolean {
  if (filter === 'all') return true;
  return item.filters.includes(filter);
}

export const recordsFeaturedCaseSlugs = [
  'yangcheon-spomove',
  'dongjak-rhythm',
  'dasarang-oneday',
  'playz-camp',
  'seodaemun-event-booth',
] as const;
