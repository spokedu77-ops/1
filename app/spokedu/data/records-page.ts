import type { HomeMediaKey } from './home-media';
import { SPOKEDU_BASE_PATH } from './site';

export type RecordsProofSummaryItem = {
  label: string;
  mediaKey: HomeMediaKey;
  cardVariant?: 'image' | 'dark' | 'glass' | 'gradient';
};

export type RecordsHubCard = {
  title: string;
  description: string;
  href: string;
  trackLabel: string;
  mediaKey: HomeMediaKey;
  cardVariant?: 'image' | 'dark' | 'glass' | 'gradient';
};

export const recordsPage = {
  hero: {
    title: '실제 수업과 기록이\n스포키듀의 실체입니다',
    subtitle: 'LAB에서 준비하고, 현장에서 운영하고, 그 경험을 사례와 기록으로 남깁니다.',
  },
  proofSummary: [
    { label: '스포키듀 LAB', mediaKey: 'proofLab', cardVariant: 'dark' },
    { label: '개인·소그룹 수업', mediaKey: 'trackPrivate', cardVariant: 'glass' },
    { label: '기관 파견 수업', mediaKey: 'trackDispatch', cardVariant: 'image' },
    { label: '원데이 체육행사', mediaKey: 'programOneday', cardVariant: 'gradient' },
    { label: '방학캠프', mediaKey: 'programCamp', cardVariant: 'image' },
    { label: '월간 스포키듀 기록', mediaKey: 'proofMonthly', cardVariant: 'glass' },
    { label: '커리큘럼 콘텐츠화', mediaKey: 'programCurriculum', cardVariant: 'gradient' },
  ] satisfies RecordsProofSummaryItem[],
  hubCards: [
    {
      title: '수업 사례',
      description: '기관·행사·프로그램별 실제 운영 사례',
      href: `${SPOKEDU_BASE_PATH}/cases`,
      trackLabel: 'records-hub-cases',
      mediaKey: 'proofClass',
      cardVariant: 'image',
    },
    {
      title: '월간 스포키듀',
      description: '월별 운영 기록과 현장 변화',
      href: `${SPOKEDU_BASE_PATH}/monthly`,
      trackLabel: 'records-hub-monthly',
      mediaKey: 'proofMonthly',
      cardVariant: 'gradient',
    },
    {
      title: '교육 인사이트',
      description: '움직임 교육 관점의 짧은 기록',
      href: `${SPOKEDU_BASE_PATH}/insights`,
      trackLabel: 'records-hub-insights',
      mediaKey: 'programCurriculum',
      cardVariant: 'dark',
    },
  ] satisfies RecordsHubCard[],
  heroMediaKey: 'trackDispatch' as HomeMediaKey,
  cta: {
    title: '현장 검증된 수업이 필요하신가요?',
    description: '개인·기관·커리큘럼 문의를 목적에 맞게 안내합니다.',
    label: '현장 검증된 수업 문의',
    href: `${SPOKEDU_BASE_PATH}/contact`,
    trackLabel: 'records-contact',
  },
} as const;

export const casesPage = {
  hero: {
    title: '실제 운영 사례',
    subtitle: '기관·행사·프로그램별로 어떻게 수업을 설계하고 운영했는지 확인하세요.',
  },
  heroMediaKey: 'proofCommunity' as HomeMediaKey,
  ctaMediaKey: 'homeHero' as HomeMediaKey,
  cta: {
    title: '비슷한 수업을 계획 중이신가요?',
    description: '공간·인원·목적을 알려주시면 운영 방향을 제안합니다.',
    primary: {
      label: '수업 문의하기',
      href: `${SPOKEDU_BASE_PATH}/contact`,
      trackLabel: 'cases-contact',
    },
    secondary: {
      label: '현장기록 허브',
      href: `${SPOKEDU_BASE_PATH}/records`,
      trackLabel: 'cases-records',
    },
  },
} as const;
