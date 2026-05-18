import { SPOKEDU_BASE_PATH } from './content';

export type InsightsCategory =
  | '학부모 가이드'
  | '기관 프로그램'
  | 'SPOMOVE'
  | 'PAPS'
  | '커리큘럼·강사교육'
  | '수업 사례';

export type InsightsCard = {
  slug: string;
  title: string;
  category: InsightsCategory;
  summary: string;
  keywords: string[];
  target: string;
  href: string;
};

export const insightsCategories: InsightsCategory[] = [
  '학부모 가이드',
  '기관 프로그램',
  'SPOMOVE',
  'PAPS',
  '커리큘럼·강사교육',
  '수업 사례',
];

export const insightsCards: InsightsCard[] = [
  {
    slug: 'why-start-exercise-lower-grades',
    title: '초등 저학년 운동, 지금 시작해야 하는 이유',
    category: '학부모 가이드',
    summary: '초등 저학년 시기에 움직임 경험이 중요한 이유와 가정에서 확인할 관찰 포인트를 정리합니다.',
    keywords: ['초등 저학년 운동', '어린이 체육 시작 시기', '학부모 체육 가이드'],
    target: '초등 저학년 자녀를 둔 학부모',
    href: `${SPOKEDU_BASE_PATH}/private`,
  },
  {
    slug: 'how-to-move-kids-hating-exercise',
    title: '운동을 싫어하는 아이를 움직이게 하는 방법',
    category: '학부모 가이드',
    summary: '운동 거부감을 낮추고 참여를 이끄는 수업 접근과 가정에서의 지원 방법을 안내합니다.',
    keywords: ['운동 싫어하는 아이', '어린이 체육 동기부여', '놀이체육 방법'],
    target: '운동을 싫어하는 아이를 둔 학부모',
    href: `${SPOKEDU_BASE_PATH}/private`,
  },
  {
    slug: 'criteria-for-kiwoom-center-program',
    title: '키움센터 체육 프로그램을 고를 때 보는 기준',
    category: '기관 프로그램',
    summary: '키움센터 담당자가 프로그램을 비교할 때 필요한 운영 기준과 체크리스트를 공유합니다.',
    keywords: ['키움센터 체육 프로그램', '방과후 체육수업', '기관 체육 프로그램 기준'],
    target: '키움센터/방과후 기관 운영 담당자',
    href: `${SPOKEDU_BASE_PATH}/dispatch`,
  },
  {
    slug: 'oneday-event-guidelines-for-local-centers',
    title: '지역아동센터 원데이 체육행사 운영 기준',
    category: '기관 프로그램',
    summary: '원데이 행사 준비, 당일 운영, 안전 동선, 참여도 관리까지 실무 기준을 정리합니다.',
    keywords: ['지역아동센터 체육행사', '원데이 체육 프로그램', '기관 행사 운영 기준'],
    target: '지역아동센터 프로그램 담당자',
    href: `${SPOKEDU_BASE_PATH}/dispatch`,
  },
  {
    slug: 'why-paps-should-be-play-based',
    title: 'PAPS를 놀이체육으로 경험해야 하는 이유',
    category: 'PAPS',
    summary: 'PAPS 요소를 평가 중심이 아닌 경험 중심으로 설계할 때 참여도가 높아지는 이유를 설명합니다.',
    keywords: ['PAPS 놀이체육', '초등 기초체력 프로그램', 'PAPS 수업 설계'],
    target: '초등 체육 운영자, 학부모',
    href: `${SPOKEDU_BASE_PATH}/programs/paps`,
  },
  {
    slug: 'what-is-spomove-class',
    title: 'SPOMOVE는 어떤 수업인가요?',
    category: 'SPOMOVE',
    summary: 'SPOMOVE의 핵심 경험과 기관/연령별 운영 방식의 차이를 실무 관점으로 정리합니다.',
    keywords: ['SPOMOVE', '빔 체육수업', '반응 훈련 체육 프로그램'],
    target: '기관 담당자, 학부모, 체육 강사',
    href: `${SPOKEDU_BASE_PATH}/programs/spomove`,
  },
  {
    slug: 'how-to-build-curriculum-from-good-classes',
    title: '좋은 체육수업을 커리큘럼으로 만드는 방법',
    category: '커리큘럼·강사교육',
    summary: '현장에서 검증한 수업을 반복 가능한 커리큘럼 자산으로 전환하는 과정을 단계별로 정리합니다.',
    keywords: ['체육 커리큘럼 제작', '강사 교육 콘텐츠', '수업 표준화'],
    target: '체육 강사, 교육기관 기획자',
    href: `${SPOKEDU_BASE_PATH}/curriculum`,
  },
  {
    slug: 'play-based-lesson-plan-criteria',
    title: '놀이체육 수업안을 만들 때 필요한 기준',
    category: '수업 사례',
    summary: '연령·공간·인원·목표에 맞춘 놀이체육 수업안 구성 기준과 적용 포인트를 제시합니다.',
    keywords: ['놀이체육 수업안', '어린이 체육 수업 설계', '체육 수업 사례'],
    target: '현장 체육 강사, 기관 운영 담당자',
    href: `${SPOKEDU_BASE_PATH}/cases`,
  },
];
