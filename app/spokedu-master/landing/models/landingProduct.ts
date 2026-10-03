import {
  getPublicProductContract,
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
    eyebrow: '먼저 확인해 보세요',
    value: '라이브러리를 먼저 둘러보고 기본 수업 도구와 지정 무료 프로그램을 사용합니다.',
    ctaLabel: 'Free로 시작하기',
  },
  lite: {
    eyebrow: '매주 수업을 운영한다면',
    value: '전체 콘텐츠를 수업반·일정·출석·수업 구성과 실제 운영까지 연결합니다.',
    ctaLabel: 'Lite 시작하기',
  },
  premium: {
    eyebrow: '기록과 다음 수업까지',
    value: 'Lite의 운영 기능에 기록·안내문·SPOMOVE와 다음 수업의 맥락을 이어 씁니다.',
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

  return {
    ...contract,
    plans,
  };
}
