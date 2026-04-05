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
    label: 'Free',
    description: '기본 기능을 무료로',
    features: [
      '로드맵 & 100대 프로그램 열람',
      '수업 보조도구 (팀 나누기, 술래 정하기)',
      '학생 무제한 등록',
      '반 1개',
    ],
  },
  basic: {
    label: 'Basic',
    description: '소규모 센터 최적화',
    features: [
      'Free 기능 전체 포함',
      '학생 무제한 등록',
      '반 최대 3개',
      'AI 에듀-에코 리포트 월 20회',
      '출결·신체 평가 CSV 내보내기',
    ],
    badge: 'Popular',
    badgeColor: 'bg-blue-500',
  },
  pro: {
    label: 'Pro',
    description: '성장하는 센터를 위한 풀 패키지',
    features: [
      'Basic 기능 전체 포함',
      '반 무제한',
      'AI 리포트 무제한',
      '우선 지원 채널',
    ],
    badge: 'Best',
    badgeColor: 'bg-amber-500',
  },
};
