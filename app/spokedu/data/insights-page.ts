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
    title: '움직임 교육을\n콘텐츠로 쌓습니다',
    subtitle: '학부모·기관·강사 관점의 짧은 움직임 교육 기록입니다.',
  },
  heroMediaKey: 'programCurriculum' as HomeMediaKey,
  categoryCards: [
    {
      category: '학부모 가이드',
      description: '가정·소그룹 수업 관점',
      mediaKey: 'trackPrivate',
      cardVariant: 'glass',
    },
    {
      category: '기관 프로그램',
      description: '파견·행사·캠프 운영',
      mediaKey: 'trackDispatch',
      cardVariant: 'image',
    },
    {
      category: 'SPOMOVE',
      description: '반응·몰입 에듀테크 수업',
      mediaKey: 'programSpomove',
      cardVariant: 'gradient',
    },
    {
      category: 'PAPS',
      description: '기초체력 놀이체육',
      mediaKey: 'programPaps',
      cardVariant: 'image',
    },
    {
      category: '커리큘럼·강사교육',
      description: '수업안·교육 콘텐츠',
      mediaKey: 'programCurriculum',
      cardVariant: 'dark',
    },
    {
      category: '수업 사례',
      description: '현장 검증 기록',
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
      label: '수업 문의하기',
      href: `${SPOKEDU_BASE_PATH}/contact?type=private`,
      trackLabel: 'insights-cta-contact',
    },
    secondary: { label: '현장기록 보기', href: `${SPOKEDU_BASE_PATH}/records`, trackLabel: 'insights-cta-records' },
  },
  ctaMediaKey: 'homeHero' as HomeMediaKey,
} as const;
