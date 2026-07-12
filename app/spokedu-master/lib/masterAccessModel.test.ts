import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  canBuySpomatFromSnapshot,
  canCreateClassRecordFromSnapshot,
  getEntitlementPaymentHref,
  getEntitlementPrimaryCtaLabel,
  getUpgradeHrefFromSnapshot,
  hasMasterEntitlement,
  hasPremiumEntitlement,
  type MasterAccessSnapshot,
} from './masterAccessModel';

function read(path: string) {
  return readFileSync(join(process.cwd(), path), 'utf8');
}

const freeSnapshot: MasterAccessSnapshot = {
  authenticated: true,
  onboardingDone: false,
  plan: 'free',
  subscriptionStatus: 'none',
  currentPeriodEnd: null,
  cancelAtPeriodEnd: false,
  isAdmin: false,
  isCenterOrTeam: false,
  canUseLibrary: false,
  canUseClassTools: false,
  canUseRecords: false,
  canUseSpomove: false,
};

const liteSnapshot: MasterAccessSnapshot = {
  ...freeSnapshot,
  plan: 'lite',
  subscriptionStatus: 'active',
  canUseLibrary: true,
  canUseClassTools: true,
  canUseRecords: true,
};

const premiumSnapshot: MasterAccessSnapshot = {
  ...liteSnapshot,
  plan: 'premium',
  canUseSpomove: true,
};

describe('masterAccessModel', () => {
  it('treats paid lite as entitled but not premium', () => {
    expect(hasMasterEntitlement(freeSnapshot)).toBe(false);
    expect(hasMasterEntitlement(liteSnapshot)).toBe(true);
    expect(hasPremiumEntitlement(liteSnapshot)).toBe(false);
  });

  it('routes free users to payment and lapsed users to re-purchase', () => {
    expect(getEntitlementPaymentHref(freeSnapshot)).toBe('/spokedu-master/payment');
    expect(getEntitlementPrimaryCtaLabel(freeSnapshot)).toBe('이용권 선택');
    expect(
      getEntitlementPaymentHref({
        ...liteSnapshot,
        subscriptionStatus: 'expired',
        canUseLibrary: false,
        canUseClassTools: false,
        canUseRecords: false,
      }),
    ).toBe('/spokedu-master/payment');
  });

  it('derives record, upgrade, and SPOMAT purchase rules from snapshot only', () => {
    expect(canCreateClassRecordFromSnapshot(liteSnapshot).allowed).toBe(true);
    expect(canCreateClassRecordFromSnapshot({
      ...liteSnapshot,
      subscriptionStatus: 'expired',
      canUseRecords: false,
    }).allowed).toBe(false);
    expect(getUpgradeHrefFromSnapshot(liteSnapshot)).toBe('/spokedu-master/subscription');
    expect(getUpgradeHrefFromSnapshot(freeSnapshot)).toBe('/spokedu-master/payment');
    expect(canBuySpomatFromSnapshot(premiumSnapshot)).toBe(true);
    expect(canBuySpomatFromSnapshot(liteSnapshot)).toBe(false);
  });
});

describe('commercial launch architecture contracts', () => {
  it('provides a single access context and preview home for unentitled users', () => {
    const provider = read('app/spokedu-master/access/MasterAccessProvider.tsx');
    const dashboard = read('app/spokedu-master/dashboard/DashboardView.tsx');
    const preview = read('app/spokedu-master/dashboard/EntitlementPreviewHome.tsx');
    const appShell = read('app/spokedu-master/components/layout/AppShell.tsx');

    expect(provider).toContain('MasterAccessProvider');
    expect(dashboard).toContain('EntitlementPreviewHome');
    expect(dashboard).toContain('EntitledDashboardView');
    expect(preview).toContain('이용권이 필요합니다');
    expect(appShell).toContain('MasterAccessProvider');
    expect(appShell).toContain('hasMasterEntitlement');
  });

  it('skips entitled content loading and operational fetches without records access', () => {
    const appShell = read('app/spokedu-master/components/layout/AppShell.tsx');
    const operational = read('app/spokedu-master/operational/OperationalDataProvider.tsx');

    expect(appShell).toContain('canLoadEntitledContent');
    expect(operational).toContain('useMasterCanUseRecords');
    expect(operational).toContain('!canUseRecords');
  });

  it('allows logged-in users to delete operational data without active entitlement', () => {
    const route = read('app/api/spokedu-master/operational-data/route.ts');
    expect(route).toContain('requireSpokeduMasterSession');
    expect(route).not.toContain('requireSpokeduMasterAccess');
  });

  it('exposes spomat availability from access snapshot and hides shop menu when unavailable', () => {
    const access = read('app/api/spokedu-master/access/route.ts');
    const profile = read('app/spokedu-master/profile/page.tsx');
    expect(access).toContain('spomatShopAvailable');
    expect(profile).toContain('useSpomatShopAvailable');
    expect(profile).toContain('spomatShopAvailable ?');
  });

  it('keeps landing claims honest and shows lite pricing', () => {
    const landing = read('app/spokedu-master/landing/page.tsx');
    expect(landing).toContain("id: 'lite'");
    expect(landing).not.toContain('100여 개');
    expect(landing).not.toContain('30초 안에');
    expect(landing).toContain('51+');
  });

  it('routes user-facing entitlement checks through access snapshot hooks', () => {
    const dashboard = read('app/spokedu-master/dashboard/DashboardView.tsx');
    const classRecord = read('app/spokedu-master/class-record/page.tsx');
    const shop = read('app/spokedu-master/shop/page.tsx');
    const provider = read('app/spokedu-master/access/MasterAccessProvider.tsx');

    expect(dashboard).toContain('useHasPremiumEntitlement');
    expect(dashboard).not.toContain('canUseSpomove(');
    expect(classRecord).toContain('canCreateClassRecordFromSnapshot');
    expect(classRecord).not.toContain('canCreateClassRecord(');
    expect(shop).toContain('useMasterCanBuySpomat');
    expect(shop).not.toContain('canBuySpomatAtMemberPrice');
    expect(provider).toContain('useMasterCanUseSpomove');
    expect(provider).toContain('useMasterCanBuySpomat');
  });

  it('wraps SPOMOVE session with an error boundary and weekly fallback UI', () => {
    const session = read('app/spokedu-master/spomove/session/page.tsx');
    const dashboard = read('app/spokedu-master/dashboard/DashboardView.tsx');

    expect(session).toContain('ErrorBoundary');
    expect(session).toContain('fallbackHref="/spokedu-master/spomove"');
    expect(dashboard).toContain('weeklyPrograms.length > 0');
    expect(dashboard).toContain('라이브러리 열기');
  });

  it('persists onboarding and profile through server API and access snapshot', () => {
    const onboarding = read('app/spokedu-master/onboarding/page.tsx');
    const profileRoute = read('app/api/spokedu-master/profile/route.ts');
    const profilePage = read('app/spokedu-master/profile/page.tsx');
    const store = read('app/spokedu-master/store/index.ts');
    const access = read('app/lib/server/spokeduMasterAccess.ts');
    const appShell = read('app/spokedu-master/components/layout/AppShell.tsx');

    expect(onboarding).toContain('/api/spokedu-master/profile');
    expect(profileRoute).toContain('requireSpokeduMasterSession');
    expect(profileRoute).toContain('upsertSpokeduMasterProfile');
    expect(profilePage).toContain('/api/spokedu-master/profile');
    expect(store).toContain('syncMasterProfile');
    expect(access).toContain('getSpokeduMasterProfile');
    expect(access).toContain('onboardingDone');
    expect(appShell).toContain('syncMasterProfile');
    expect(appShell).toContain('accessGuard.snapshot?.onboardingDone');
  });
});
