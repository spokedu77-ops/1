export type Plan = 'free' | 'basic' | 'pro';

export type PlanLimit = {
  aiReportsPerMonth: number;
  maxClasses: number | null;
};

export type PlanUiMeta = {
  label: string;
  description: string;
  features: string[];
  badge?: string;
  badgeColor?: string;
};

export const PLAN_PRICES: Record<Plan, number> = {
  free: 0,
  basic: 49900,
  pro: 79900,
};

export const PLAN_LIMITS: Record<Plan, PlanLimit> = {
  free: { aiReportsPerMonth: 0, maxClasses: 1 },
  basic: { aiReportsPerMonth: 20, maxClasses: 3 },
  pro: { aiReportsPerMonth: Number.POSITIVE_INFINITY, maxClasses: null },
};

export const PLAN_UI_ORDER: Plan[] = ['free', 'basic', 'pro'];

export const PLAN_UI_META: Record<Plan, PlanUiMeta> = {
  free: {
    label: '체험',
    description: 'SPOKEDU PRO의 핵심 기능을 제한적으로 둘러보세요.',
    features: [
      '일부 놀이체육 콘텐츠 미리보기',
      '일부 SPOMOVE 반응훈련 체험',
      '수업 보조도구 일부 사용',
      '반 1개',
    ],
  },
  basic: {
    label: 'Library',
    description: '놀이체육 수업 준비를 줄이는 기본 플랜',
    features: [
      '놀이체육 라이브러리 150개+',
      '영상+텍스트 수업안',
      '연령·공간·준비물별 콘텐츠 탐색',
      '매월 신규 콘텐츠 업데이트',
      '수업 보조도구',
      '반 최대 3개',
    ],
    badge: '입문 추천',
    badgeColor: 'bg-blue-500',
  },
  pro: {
    label: 'All-in-One',
    description: '놀이체육 라이브러리와 SPOMOVE를 모두 쓰는 도장용 풀 패키지',
    features: [
      'Library 기능 전체 포함',
      'SPOMOVE 반응훈련 50개+',
      '스크린 전체화면 실행',
      '이번 주 도장 수업 추천 루틴',
      '공개수업·이벤트 수업 활용',
      '원생 성장 리포트',
      '우선 지원',
    ],
    badge: '도장 추천',
    badgeColor: 'bg-amber-500',
  },
};
