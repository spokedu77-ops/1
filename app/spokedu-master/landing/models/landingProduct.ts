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

const LANDING_COPY_MAP: Readonly<Record<string, string>> = {
  '놀이체육 탐색': '놀이체육 둘러보기',
  '전체 놀이체육': '전체 놀이체육 이용',
  '놀이체육 전체 이용': '전체 놀이체육 수업 자료 이용',
  'Lite의 모든 기능': '라이트의 모든 기능',
};

/** 확정된 문구에만 한글 표기를 적용하고 브랜드명·조사를 부분 치환하지 않는다. */
export function localizeLandingCopy(value: string): string {
  return LANDING_COPY_MAP[value] ?? value;
}

const PLAN_MESSAGES = {
  free: {
    displayName: '무료',
    eyebrow: '먼저 직접 확인해 보세요',
    value: '놀이체육을 둘러보고 지정된 놀이체육 프로그램 1개를 미리보며 스탑워치·타이머·점수판을 이용합니다.',
    ctaLabel: '무료로 시작하기',
  },
  lite: {
    displayName: '라이트',
    eyebrow: '수업관리 전체',
    value: '놀이체육과 반·학생·일정·출석, 기록과 안내문까지 일반 수업관리 흐름을 모두 제공합니다.',
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
