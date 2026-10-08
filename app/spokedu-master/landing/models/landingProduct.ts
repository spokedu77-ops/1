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

export function localizeLandingCopy(value: string) {
  return value
    .replaceAll('SPOKEDU LAB', '__SPOKEDU_LAB__')
    .replaceAll('Library', '수업 자료실')
    .replaceAll('Class Tools', '수업 도구')
    .replaceAll('Session', '수업 기록')
    .replaceAll('Premium', '프리미엄')
    .replaceAll('Lite', '라이트')
    .replaceAll('Free', '무료')
    .replaceAll('PC', '컴퓨터')
    .replaceAll('TV', '텔레비전')
    .replaceAll('LAB', 'SPOKEDU LAB')
    .replaceAll('__SPOKEDU_LAB__', 'SPOKEDU LAB');
}

const PLAN_MESSAGES = {
  free: {
    displayName: '무료',
    eyebrow: '먼저 직접 확인해 보세요',
    value: '수업 자료실을 둘러보고 이번 주 추천 프로그램 1개 전체와 수업 도구 3종을 이용합니다.',
    ctaLabel: '무료로 시작하기',
  },
  lite: {
    displayName: '라이트',
    eyebrow: '수업관리 전체',
    value: '수업 자료실과 반·학생·일정·출석, 기록과 안내문까지 일반 수업관리 흐름을 모두 제공합니다.',
    ctaLabel: '라이트 시작하기',
  },
  premium: {
    displayName: '프리미엄',
    eyebrow: 'SPOMOVE 포함',
    value: '라이트의 모든 수업관리 기능에 화면과 움직임을 연결하는 SPOMOVE 공식 콘텐츠와 현장 실행 환경을 더합니다.',
    ctaLabel: '프리미엄 시작하기',
  },
} as const;

export function getLandingProductModel() {
  const contract = getPublicProductContract();
  const plans: LandingPlan[] = contract.plans.map((plan) => ({
    ...plan,
    ...PLAN_MESSAGES[plan.code],
    featureSummary: plan.featureSummary.map(localizeLandingCopy),
    ctaHref: plan.code === 'free'
      ? contract.handoff.freeStartHref
      : contract.handoff.paymentPlanHref(plan.code),
  }));

  return {
    ...contract,
    plans,
    comparison: getPublicPlanComparison().map((row) => ({ ...row, label: localizeLandingCopy(row.label) })),
  };
}
