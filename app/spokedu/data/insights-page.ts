import type { HomeMediaKey } from './home-media';
import type { InsightsCategory } from './insights';
import { SPOKEDU_BASE_PATH } from './site';

export type InsightsCategoryCard = {
  category: InsightsCategory;
  description: string;
  mediaKey: HomeMediaKey;
  cardVariant: 'image' | 'dark' | 'glass' | 'gradient';
};

export const insightsPage = {
  hero: {
    title: '교육 인사이트',
    subtitle: '학부모·기관·강사 관점에서 실제 수업 운영에 바로 적용할 수 있는 인사이트를 정리합니다.',
  },
  heroMediaKey: 'programCurriculum' as HomeMediaKey,
  categoryCards: [
    {
      category: '학부모 가이드',
      description: '운동을 싫어하는 아이도 시작할 수 있는 가정·소그룹 수업 전략',
      mediaKey: 'trackPrivate',
      cardVariant: 'glass',
    },
    {
      category: '기관 프로그램',
      description: '정규수업·원데이·캠프를 운영 조건에 맞춰 설계하는 기관 운영 관점',
      mediaKey: 'trackDispatch',
      cardVariant: 'image',
    },
    {
      category: 'SPOMOVE',
      description: '보고·선택·반응 흐름으로 몰입과 참여 전환을 만드는 에듀테크 수업',
      mediaKey: 'programSpomove',
      cardVariant: 'gradient',
    },
    {
      category: 'PAPS',
      description: '평가 부담 없이 기초체력을 경험하게 하는 놀이형 스테이션 운영',
      mediaKey: 'programPaps',
      cardVariant: 'image',
    },
    {
      category: '커리큘럼·강사교육',
      description: '수업안·매뉴얼·강사 교육으로 현장 기준을 맞추는 콘텐츠 운영',
      mediaKey: 'programCurriculum',
      cardVariant: 'dark',
    },
    {
      category: '수업 사례',
      description: '기관별 운영 사례와 다음 설계 포인트를 함께 보는 기록',
      mediaKey: 'proofClass',
      cardVariant: 'glass',
    },
  ] satisfies InsightsCategoryCard[],
  audienceLinks: [
    {
      audience: '학부모',
      href: `${SPOKEDU_BASE_PATH}/private`,
      trackLabel: 'insights-audience-private',
    },
    {
      audience: '기관 담당자',
      href: `${SPOKEDU_BASE_PATH}/dispatch`,
      trackLabel: 'insights-audience-dispatch',
    },
    {
      audience: '선생님·파트너',
      href: `${SPOKEDU_BASE_PATH}/curriculum`,
      trackLabel: 'insights-audience-curriculum',
    },
  ],
  cta: {
    primary: {
      label: '문의 유형 선택',
      href: `${SPOKEDU_BASE_PATH}/contact`,
      trackLabel: 'insights-cta-contact',
    },
    secondary: { label: '현장 기록', href: `${SPOKEDU_BASE_PATH}/records`, trackLabel: 'insights-cta-records' },
  },
  ctaMediaKey: 'homeHero' as HomeMediaKey,
} as const;
