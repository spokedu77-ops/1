/**
 * SPOKEDU MASTER entitlement model — single source of truth for UI capability checks.
 * Mirrors server rules in `app/lib/server/spokeduMasterAccess.ts` via `/api/spokedu-master/access`.
 */

import type { LimitStatus } from './subscription';

export type MasterAccessPlan = 'free' | 'lite' | 'premium' | 'team';

export type MasterAccessSubscriptionStatus = 'none' | 'active' | 'expired' | 'cancelled';

export type MasterAccessSnapshot = {
  authenticated: true;
  onboardingDone: boolean;
  plan: MasterAccessPlan;
  subscriptionStatus: MasterAccessSubscriptionStatus;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  isAdmin: boolean;
  isCenterOrTeam: boolean;
  canUseLibrary: boolean;
  canUseClassTools: boolean;
  canUseRecords: boolean;
  canUseSpomove: boolean;
};

export type MasterAccessApiResponse = MasterAccessSnapshot & {
  ok: boolean;
  allowed: boolean;
  spomatShopAvailable?: boolean;
};

export function hasMasterEntitlement(snapshot: MasterAccessSnapshot | null | undefined): boolean {
  if (!snapshot) return false;
  return snapshot.canUseLibrary || snapshot.canUseClassTools || snapshot.canUseRecords;
}

export function hasPremiumEntitlement(snapshot: MasterAccessSnapshot | null | undefined): boolean {
  if (!snapshot) return false;
  return snapshot.canUseSpomove;
}

export function hasActivePaidSubscription(snapshot: MasterAccessSnapshot | null | undefined): boolean {
  if (!snapshot) return false;
  if (snapshot.isAdmin) return true;
  return snapshot.subscriptionStatus === 'active' && snapshot.plan !== 'free';
}

export function getEntitlementPaymentHref(snapshot: MasterAccessSnapshot | null | undefined): string {
  if (!snapshot || snapshot.subscriptionStatus === 'none') {
    return '/spokedu-master/payment';
  }
  if (snapshot.subscriptionStatus === 'expired' || snapshot.subscriptionStatus === 'cancelled') {
    return '/spokedu-master/payment';
  }
  if (snapshot.plan === 'lite' && snapshot.subscriptionStatus === 'active' && !snapshot.cancelAtPeriodEnd) {
    return '/spokedu-master/payment?plan=premium';
  }
  return '/spokedu-master/subscription';
}

export function getEntitlementPrimaryCtaLabel(snapshot: MasterAccessSnapshot | null | undefined): string {
  if (!snapshot || snapshot.subscriptionStatus === 'none') return '구독 선택';
  if (snapshot.subscriptionStatus === 'expired' || snapshot.subscriptionStatus === 'cancelled') {
    return '구독 다시 선택';
  }
  if (snapshot.plan === 'lite' && snapshot.subscriptionStatus === 'active') return '프리미엄 업그레이드';
  return '구독 선택';
}

export function canBuySpomatFromSnapshot(snapshot: MasterAccessSnapshot | null | undefined): boolean {
  if (!snapshot) return false;
  return snapshot.subscriptionStatus === 'active' && snapshot.plan === 'premium';
}

export function canCreateClassRecordFromSnapshot(snapshot: MasterAccessSnapshot | null | undefined): LimitStatus {
  if (!snapshot) {
    return {
      allowed: false,
      label: '권한 없음',
      reason: '활성 이용권이 필요합니다.',
    };
  }
  if (snapshot.isAdmin) return { allowed: true, label: '관리자' };
  if (snapshot.subscriptionStatus === 'expired' || snapshot.subscriptionStatus === 'cancelled') {
    return {
      allowed: false,
      label: '이용권 만료',
      reason: '이용 기간이 종료되어 새 수업 기록 생성이 제한됩니다.',
    };
  }
  if (!snapshot.canUseRecords) {
    return {
      allowed: false,
      label: '권한 없음',
      reason: '활성 이용권이 필요합니다.',
    };
  }
  return { allowed: true, label: '사용 가능' };
}

export function getUpgradeHrefFromSnapshot(snapshot: MasterAccessSnapshot | null | undefined): string {
  return hasMasterEntitlement(snapshot) ? '/spokedu-master/subscription' : getEntitlementPaymentHref(snapshot);
}

export function getUpgradeLabelFromSnapshot(snapshot: MasterAccessSnapshot | null | undefined): string {
  return hasMasterEntitlement(snapshot) ? '구독 확인' : '구독 선택';
}
