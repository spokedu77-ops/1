import type { PlanType, UserProfile } from '../types';
import { MASTER_PRODUCT_CATALOG, type MasterProductKey } from './productCatalog';

export type LimitStatus = {
  allowed: boolean;
  label: string;
  reason?: string;
};

export const PLAN_LIMITS: Record<PlanType, { kakaoMonthly: number | null; aiMonthly: number | null; pdfMonthly: number | null; canUseDirectorDashboard: boolean }> = {
  free: { kakaoMonthly: 0, aiMonthly: 0, pdfMonthly: 0, canUseDirectorDashboard: false },
  lite: { kakaoMonthly: 0, aiMonthly: 0, pdfMonthly: 0, canUseDirectorDashboard: false },
  premium: { kakaoMonthly: 0, aiMonthly: 0, pdfMonthly: 0, canUseDirectorDashboard: false },
  pro: { kakaoMonthly: 0, aiMonthly: 0, pdfMonthly: 0, canUseDirectorDashboard: false },
  team: { kakaoMonthly: 0, aiMonthly: 0, pdfMonthly: 0, canUseDirectorDashboard: false },
};

export function isPaidAccessExpired(profile: UserProfile | null): boolean {
  return profile?.subscriptionStatus === 'expired';
}

export function isPaidMasterPlan(profile: UserProfile | null): boolean {
  if (profile?.isAdmin) return true;
  return (profile?.plan === 'lite' || profile?.plan === 'premium' || profile?.plan === 'pro' || profile?.plan === 'team') && profile.subscriptionStatus === 'active';
}

export const isActiveMasterPlan = isPaidMasterPlan;

export function hasMasterAccess(profile: UserProfile | null): boolean {
  return isPaidMasterPlan(profile);
}

export function hasPremiumMasterAccess(profile: UserProfile | null): boolean {
  if (profile?.isAdmin) return true;
  return (
    (profile?.plan === 'premium' || profile?.plan === 'pro' || profile?.plan === 'team') &&
    profile.subscriptionStatus === 'active'
  );
}

export function getUpgradeHref(profile: UserProfile | null): string {
  return isPaidMasterPlan(profile) ? '/spokedu-master/subscription' : '/spokedu-master/payment';
}

export function getUpgradeLabel(profile: UserProfile | null): string {
  return isPaidMasterPlan(profile) ? '이용권 확인' : '상품 보기';
}

function resolveMasterProductKey(profile: UserProfile | null): MasterProductKey | null {
  if (profile?.isAdmin) return 'center';
  if (profile?.plan === 'lite' && profile.subscriptionStatus === 'active') return 'lite';
  if (profile?.plan === 'team' && profile.subscriptionStatus === 'active') return 'center';
  if ((profile?.plan === 'premium' || profile?.plan === 'pro') && profile.subscriptionStatus === 'active') return 'premium';
  return null;
}

export function canUseLibrary(profile: UserProfile | null): boolean {
  const productKey = resolveMasterProductKey(profile);
  return productKey ? MASTER_PRODUCT_CATALOG[productKey].featureEntitlements.canUseLibrary : false;
}

export function canUseClassTools(profile: UserProfile | null): boolean {
  const productKey = resolveMasterProductKey(profile);
  return productKey ? MASTER_PRODUCT_CATALOG[productKey].featureEntitlements.canUseClassTools : false;
}

export function canUseRecords(profile: UserProfile | null): boolean {
  const productKey = resolveMasterProductKey(profile);
  return productKey ? MASTER_PRODUCT_CATALOG[productKey].featureEntitlements.canUseRecords : false;
}

export function canUseSpomove(profile: UserProfile | null): boolean {
  const productKey = resolveMasterProductKey(profile);
  return productKey ? MASTER_PRODUCT_CATALOG[productKey].featureEntitlements.canUseSpomove : false;
}

export function canBuySpomatAtMemberPrice(profile: UserProfile | null): boolean {
  const productKey = resolveMasterProductKey(profile);
  return productKey ? MASTER_PRODUCT_CATALOG[productKey].canBuySpomatAtMemberPrice : false;
}

export function canCreateClassRecord(profile: UserProfile | null): LimitStatus {
  if (profile?.isAdmin) return { allowed: true, label: '관리자' };
  if (isPaidAccessExpired(profile)) {
    return {
      allowed: false,
      label: '이용권 만료',
      reason: '이용 기간이 종료되어 새 수업 기록 생성이 제한됩니다.',
    };
  }
  if (!canUseRecords(profile)) {
    return {
      allowed: false,
      label: '권한 없음',
      reason: '활성 이용권이 필요합니다.',
    };
  }
  return { allowed: true, label: '사용 가능' };
}

export function canUseMonthlyLimit(_plan: PlanType, _used: number, kind: 'kakao' | 'ai' | 'pdf', isAdmin = false): LimitStatus {
  if (isAdmin) return { allowed: true, label: '관리자' };
  const label = kind === 'kakao' ? '미제공' : kind === 'ai' ? '미제공' : '안내문 우선';
  return {
    allowed: false,
    label,
    reason: '첫 버전에서는 자동 발송과 자동 리포트보다 라이브러리, SPOMOVE, 안내문을 우선 제공합니다.',
  };
}
