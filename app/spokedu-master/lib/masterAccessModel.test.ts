import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
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
  canBrowseLibrary: true,
  canUseLibrary: false,
  freePreviewProgramIds: ['68'],
  canUseClassTools: true,
  canUseAttendance: false,
  canUseRecords: false,
  canUseSpomove: false,
};

const liteSnapshot: MasterAccessSnapshot = {
  ...freeSnapshot,
  plan: 'lite',
  subscriptionStatus: 'active',
  canUseLibrary: true,
  canUseClassTools: true,
  canUseAttendance: true,
  canUseRecords: true,
};

const premiumSnapshot: MasterAccessSnapshot = {
  ...liteSnapshot,
  plan: 'premium',
  canUseRecords: true,
  canUseSpomove: true,
};

describe('masterAccessModel', () => {
  it('treats paid lite as entitled but not premium', () => {
    expect(hasMasterEntitlement(freeSnapshot)).toBe(false);
    expect(hasMasterEntitlement(liteSnapshot)).toBe(true);
    expect(hasPremiumEntitlement(liteSnapshot)).toBe(false);
  });

  it('routes free users to payment and lapsed users to re-purchase', () => {
    expect(getEntitlementPaymentHref(freeSnapshot)).toBe('/spokedu-lab/payment');
    expect(getEntitlementPrimaryCtaLabel(freeSnapshot)).toBe('구독 선택');
    expect(
      getEntitlementPaymentHref({
        ...liteSnapshot,
        subscriptionStatus: 'expired',
        canBrowseLibrary: true,
  canUseLibrary: false,
  freePreviewProgramIds: ['68'],
        canUseClassTools: false,
        canUseAttendance: false,
        canUseRecords: false,
      }),
    ).toBe('/spokedu-lab/payment');
  });

  it('derives record and upgrade rules from snapshot only', () => {
    expect(canCreateClassRecordFromSnapshot(liteSnapshot).allowed).toBe(true);
    expect(canCreateClassRecordFromSnapshot(premiumSnapshot).allowed).toBe(true);
    expect(canCreateClassRecordFromSnapshot({
      ...liteSnapshot,
      subscriptionStatus: 'expired',
      canUseClassTools: false,
      canUseAttendance: false,
      canUseRecords: false,
    }).allowed).toBe(false);
    expect(getUpgradeHrefFromSnapshot(liteSnapshot)).toBe('/spokedu-lab/subscription');
    expect(getUpgradeHrefFromSnapshot(freeSnapshot)).toBe('/spokedu-lab/payment');
  });
});

describe('commercial launch architecture contracts', () => {
  it('provides a single access context and preview home for unentitled users', () => {
    const provider = read('app/spokedu-master/access/MasterAccessProvider.tsx');
    const dashboard = read('app/spokedu-master/dashboard/DashboardView.tsx');
    const preview = read('app/spokedu-master/dashboard/EntitlementPreviewHome.tsx');
    const appShell = read('app/spokedu-master/components/layout/AppShell.tsx');

    expect(provider).toContain('MasterAccessProvider');
    expect(dashboard).toContain('selectWeeklyProgramsById(programs)');
    expect(dashboard).toContain('EntitledDashboardView');
    expect(preview).toContain('이번 주 첫 무료 수업 1개, 스탑워치·타이머·점수판은 계속 사용할 수 있습니다');
    expect(appShell).toContain('MasterAccessProvider');
    expect(appShell).toContain('canBrowseLibrary');
  });

  it('loads operational data from Lite attendance access while gating entitled content centrally', () => {
    const appShell = read('app/spokedu-master/components/layout/AppShell.tsx');
    const operational = read('app/spokedu-master/operational/OperationalDataProvider.tsx');

    expect(appShell).toContain('canBrowseLibrary');
    expect(appShell).toContain('canSyncFavorites');
    expect(operational).toContain('useMasterCanUseAttendance');
    expect(operational).toContain('!canUseAttendance');
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

  it('keeps landing claims honest and derives plan pricing from the public contract', () => {
    const landing = read('app/spokedu-master/landing/CommercialLanding.tsx');
    const model = read('app/spokedu-master/landing/models/landingProduct.ts');
    const sections = read('app/spokedu-master/landing/components/LandingSections.tsx');
    expect(landing).toContain('getLandingProductModel()');
    expect(model).toContain('getPublicProductContract()');
    expect(sections).toContain('product.plans.map');
    expect(landing).not.toContain('100여 개');
    expect(landing).not.toContain('30초 안에');
    expect(model).not.toContain('9900');
    expect(model).not.toContain('28900');
  });

  it('routes user-facing entitlement checks through access snapshot hooks', () => {
    const dashboard = read('app/spokedu-master/dashboard/DashboardView.tsx');
    const classRecord = read('app/spokedu-master/class-record/page.tsx');
    const shop = read('app/spokedu-master/shop/page.tsx');
    const provider = read('app/spokedu-master/access/MasterAccessProvider.tsx');

    expect(dashboard).toContain('useMasterAccessSnapshot');
    expect(dashboard).toContain('isProgramLessonLocked');
    expect(dashboard).not.toContain('canUseSpomove(');
    expect(classRecord).toContain("redirect('/spokedu-lab/activity')");
    expect(shop).not.toContain('useMasterCanBuySpomat');
    expect(shop).not.toContain('회원가');
    expect(provider).toContain('useMasterCanUseSpomove');
    expect(provider).not.toContain('useMasterCanBuySpomat');
  });

  it('wraps SPOMOVE session with an error boundary and keeps Session operations first', () => {
    const session = read('app/spokedu-master/spomove/session/page.tsx');
    const dashboard = read('app/spokedu-master/dashboard/DashboardView.tsx');

    expect(session).toContain('ErrorBoundary');
    expect(session).toContain('fallbackHref="/spokedu-lab/spomove"');
    expect(dashboard).toContain('HomeContinueCard');
    expect(dashboard).toContain('href={`/spokedu-lab/activity?session=${encodeURIComponent(nextSession.id)}`}');
    expect(dashboard).toContain('data-dashboard-section="featured-flow"');
    expect(dashboard).not.toContain('HomeOpsBoard');
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
