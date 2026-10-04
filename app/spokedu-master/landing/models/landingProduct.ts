import {
  getPublicProductContract,
  getPublicPlanComparison,
  type PublicProductPlan,
} from '../../lib/publicProductContract';

export type LandingPlan = PublicProductPlan & {
  eyebrow: string;
  value: string;
  ctaLabel: string;
  ctaHref: string;
};

const PLAN_MESSAGES = {
  free: {
    eyebrow: '먼저 직접 확인해 보세요',
    value: 'Library를 탐색하고 이번 주 추천 프로그램 1개 전체와 수업 도구 3종을 이용합니다.',
    ctaLabel: '무료로 시작하기',
  },
  lite: {
    eyebrow: '수업관리 전체',
    value: 'Library와 반·학생·일정·출석, 기록과 안내문까지 일반 수업관리 흐름을 모두 제공합니다.',
    ctaLabel: 'Lite 시작하기',
  },
  premium: {
    eyebrow: 'SPOMOVE 포함',
    value: 'Lite의 모든 수업관리 기능에 화면과 움직임을 연결하는 SPOMOVE 공식 콘텐츠와 현장 실행 환경을 더합니다.',
    ctaLabel: '프리미엄 시작하기',
  },
} as const;

export function getLandingProductModel() {
  const contract = getPublicProductContract();
  const plans: LandingPlan[] = contract.plans.map((plan) => ({
    ...plan,
    ...PLAN_MESSAGES[plan.code],
    ctaHref: plan.code === 'free'
      ? contract.handoff.freeStartHref
      : contract.handoff.paymentPlanHref(plan.code),
  }));

  return { ...contract, plans, comparison: getPublicPlanComparison() };
}
