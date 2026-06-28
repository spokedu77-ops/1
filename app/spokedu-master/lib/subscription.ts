import type { PlanType, UserProfile } from '../types';

export type LimitStatus = {
  allowed: boolean;
  label: string;
  reason?: string;
};

export const PLAN_LIMITS: Record<PlanType, { kakaoMonthly: number | null; aiMonthly: number | null; pdfMonthly: number | null; canUseDirectorDashboard: boolean }> = {
  free: { kakaoMonthly: 0, aiMonthly: 0, pdfMonthly: 0, canUseDirectorDashboard: false },
  pro: { kakaoMonthly: 0, aiMonthly: 0, pdfMonthly: 0, canUseDirectorDashboard: false },
  team: { kakaoMonthly: 0, aiMonthly: 0, pdfMonthly: 0, canUseDirectorDashboard: false },
};

export function getTrialDaysLeft(profile: UserProfile | null): number {
  if (!profile?.trialEndsAt) return 0;
  return Math.max(0, Math.ceil((new Date(profile.trialEndsAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000)));
}

export function isActiveTrial(profile: UserProfile | null): boolean {
  return (profile?.plan ?? 'free') === 'free' && getTrialDaysLeft(profile) > 0;
}

export function isTrialExpired(profile: UserProfile | null): boolean {
  if (profile?.isAdmin) return false;
  return (profile?.plan ?? 'free') === 'free' && !isActiveTrial(profile);
}

export function isPaidAccessExpired(profile: UserProfile | null): boolean {
  return profile?.subscriptionStatus === 'expired';
}

export function isPaidMasterPlan(profile: UserProfile | null): boolean {
  if (profile?.isAdmin) return true;
  return (profile?.plan === 'pro' || profile?.plan === 'team') && profile.subscriptionStatus === 'active';
}

export const isActiveMasterPlan = isPaidMasterPlan;

export function hasMasterAccess(profile: UserProfile | null): boolean {
  return isPaidMasterPlan(profile) || isActiveTrial(profile);
}

export function getUpgradeHref(profile: UserProfile | null): string {
  return isPaidMasterPlan(profile) ? '/spokedu-master/subscription' : '/spokedu-master/profile?plans=1';
}

export function getUpgradeLabel(profile: UserProfile | null): string {
  return isPaidMasterPlan(profile) ? '이용권 확인' : '30일 이용권 보기';
}

export function canCreateClassRecord(profile: UserProfile | null): LimitStatus {
  if (profile?.isAdmin) return { allowed: true, label: '관리자' };
  if (isPaidAccessExpired(profile)) {
    return {
      allowed: false,
      label: '이용권 만료',
      reason: '이용 기간이 종료되어 새 수업 기록 생성이 제한됩니다. 30일 이용권을 다시 결제해 주세요.',
    };
  }
  if (isTrialExpired(profile)) {
    return {
      allowed: false,
      label: '체험 만료',
      reason: '무료 체험이 종료되어 새 수업 기록 생성이 제한됩니다. 기존 데이터는 계속 열람할 수 있습니다.',
    };
  }
  return { allowed: true, label: '사용 가능' };
}

export function canUseMonthlyLimit(_plan: PlanType, _used: number, kind: 'kakao' | 'ai' | 'pdf', isAdmin = false): LimitStatus {
  if (isAdmin) return { allowed: true, label: '관리자' };
  const label = kind === 'kakao' ? '준비 중' : kind === 'ai' ? '준비 중' : '안내문 우선';
  return {
    allowed: false,
    label,
    reason: '첫 버전에서는 자동 발송과 자동 리포트보다 라이브러리, SPOMOVE, 안내문을 우선 제공합니다.',
  };
}
