import type { HomeMediaKey } from './home-media';
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
  mediaKey: HomeMediaKey;
  cardVariant: 'image' | 'dark' | 'glass' | 'gradient';
  ctaLabel: string;
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
    summary: '저학년 움직임 경험이 이후 체력·자신감에 미치는 영향과 가정에서 볼 포인트.',
    keywords: ['초등 저학년 운동', '어린이 체육 시작', '학부모 가이드'],
    target: '초등 저학년 학부모',
    href: `${SPOKEDU_BASE_PATH}/private`,
    mediaKey: 'trackPrivate',
    cardVariant: 'glass',
    ctaLabel: '개인·소그룹 수업',
  },
  {
    slug: 'how-to-move-kids-hating-exercise',
    title: '운동을 싫어하는 아이를 움직이게 하는 방법',
    category: '학부모 가이드',
    summary: '거부감을 낮추는 참여 설계와 가정에서 이어지는 작은 움직임 루틴.',
    keywords: ['운동 싫어하는 아이', '놀이체육', '체육 동기'],
    target: '운동 거부 아이 학부모',
    href: `${SPOKEDU_BASE_PATH}/private`,
    mediaKey: 'trackPrivate',
    cardVariant: 'image',
    ctaLabel: '상담 문의',
  },
  {
    slug: 'criteria-for-kiwoom-center-program',
    title: '키움센터 체육 프로그램을 고를 때 보는 기준',
    category: '기관 프로그램',
    summary: '공간·인원·목표에 맞는 프로그램을 고를 때 확인할 운영 체크리스트.',
    keywords: ['키움센터 체육', '방과후 체육', '기관 프로그램'],
    target: '키움·방과후 담당자',
    href: `${SPOKEDU_BASE_PATH}/dispatch`,
    mediaKey: 'proofClass',
    cardVariant: 'gradient',
    ctaLabel: '기관 수업 제안',
  },
  {
    slug: 'why-paps-should-be-play-based',
    title: 'PAPS를 놀이체육으로 경험해야 하는 이유',
    category: 'PAPS',
    summary: '평가 중심이 아닌 놀이 중심일 때 참여와 체력 경험이 달라지는 이유.',
    keywords: ['PAPS 놀이체육', '기초체력', '초등 체육'],
    target: '기관·학부모',
    href: `${SPOKEDU_BASE_PATH}/programs/paps`,
    mediaKey: 'programPaps',
    cardVariant: 'image',
    ctaLabel: 'PAPS 보기',
  },
  {
    slug: 'what-is-spomove-class',
    title: 'SPOMOVE는 어떤 수업인가요?',
    category: 'SPOMOVE',
    summary: '보고·선택·반응·움직임이 한 흐름으로 이어지는 에듀테크 놀이체육.',
    keywords: ['SPOMOVE', '빔 체육', '반응 훈련'],
    target: '기관·학부모·강사',
    href: `${SPOKEDU_BASE_PATH}/programs/spomove`,
    mediaKey: 'programSpomove',
    cardVariant: 'dark',
    ctaLabel: 'SPOMOVE 보기',
  },
  {
    slug: 'how-to-build-curriculum-from-good-classes',
    title: '좋은 체육수업을 커리큘럼으로 만드는 방법',
    category: '커리큘럼·강사교육',
    summary: '현장 수업을 수업안·매뉴얼·강사교육 패키지로 바꾸는 3단계.',
    keywords: ['체육 커리큘럼', '강사 교육', '수업 표준화'],
    target: '강사·교육 파트너',
    href: `${SPOKEDU_BASE_PATH}/curriculum`,
    mediaKey: 'programCurriculum',
    cardVariant: 'gradient',
    ctaLabel: '커리큘럼 문의',
  },
];
