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
    title: '현장 기록 허브',
    subtitle: 'LAB·사례·월간·인사이트를 통해 수업 운영 근거와 개선 흐름을 한곳에서 확인합니다.',
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
      description: '기관·행사·프로그램별 실제 운영 장면과 결과를 케이스 단위로 확인합니다.',
      href: `${SPOKEDU_BASE_PATH}/cases`,
      trackLabel: 'records-hub-cases',
      mediaKey: 'proofClass',
      cardVariant: 'image',
    },
    {
      title: '월간 스포키듀',
      description: '월별 운영 변화와 다음 개선 포인트를 기록해 누적 흐름으로 보여줍니다.',
      href: `${SPOKEDU_BASE_PATH}/monthly`,
      trackLabel: 'records-hub-monthly',
      mediaKey: 'proofMonthly',
      cardVariant: 'gradient',
    },
    {
      title: '교육 인사이트',
      description: '학부모·기관·강사 관점에서 바로 적용할 수 있는 운영 인사이트를 정리합니다.',
      href: `${SPOKEDU_BASE_PATH}/insights`,
      trackLabel: 'records-hub-insights',
      mediaKey: 'programCurriculum',
      cardVariant: 'dark',
    },
  ] satisfies RecordsHubCard[],
  heroMediaKey: 'proofLab' as HomeMediaKey,
  cta: {
    title: '문의 유형 선택',
    description: '개인·기관·콘텐츠 목적별로 안내합니다.',
    label: '문의하기',
    href: `${SPOKEDU_BASE_PATH}/contact`,
    trackLabel: 'records-contact',
  },
} as const;

export const casesPage = {
  hero: {
    title: '수업 사례',
    subtitle: '기관·행사·프로그램별 실제 운영 방식과 현장 반응을 사례 단위로 확인합니다.',
  },
  heroMediaKey: 'proofCommunity' as HomeMediaKey,
  ctaMediaKey: 'proofEvent' as HomeMediaKey,
  cta: {
    title: '비슷한 수업 계획',
    description: '공간·인원·운영 목적을 알려주시면 사례 기반으로 맞는 운영안을 제안합니다.',
    primary: {
      label: '기관수업 제안',
      href: `${SPOKEDU_BASE_PATH}/contact?type=dispatch`,
      trackLabel: 'cases-contact',
    },
    secondary: {
      label: '현장 기록',
      href: `${SPOKEDU_BASE_PATH}/records`,
      trackLabel: 'cases-records',
    },
  },
} as const;
