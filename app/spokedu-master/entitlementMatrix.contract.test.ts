import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  buildSpokeduMasterAccessSnapshot,
  type SpokeduMasterSubscriptionRow,
} from '@/app/lib/server/spokeduMasterAccess';
import { MASTER_PRODUCT_CATALOG, getMasterProductPaymentFeatureLabels } from './lib/productCatalog';
import { getMasterRouteRequirement } from './components/layout/masterRouteAccess';

function row(overrides: Partial<SpokeduMasterSubscriptionRow>): SpokeduMasterSubscriptionRow {
  return {
    plan: null,
    status: null,
    period_end: null,
    trial_started_at: null,
    trial_ends_at: null,
    cancel_at_period_end: false,
    next_billing_at: null,
    current_period_end: null,
    ...overrides,
  };
}

/** Locked capability matrix: server snapshot ↔ catalog ↔ GateWall / TabBar / routes. */
const CAPABILITY_MATRIX = {
  free: {
    canUseLibrary: false,
    canUseClassTools: true,
    canUseAttendance: false,
    canUseRecords: false,
    canUseSpomove: false,
  },
  lite: {
    canUseLibrary: true,
    canUseClassTools: true,
    canUseAttendance: true,
    canUseRecords: false,
    canUseSpomove: false,
  },
  premium: {
    canUseLibrary: true,
    canUseClassTools: true,
    canUseAttendance: true,
    canUseRecords: true,
    canUseSpomove: true,
  },
  expired: {
    canUseLibrary: false,
    canUseClassTools: false,
    canUseAttendance: false,
    canUseRecords: false,
    canUseSpomove: false,
  },
} as const;

function read(path: string) {
  return readFileSync(join(process.cwd(), path), 'utf8');
}

describe('SPOKEDU MASTER entitlement matrix (P1)', () => {
  it('locks server access snapshot to the commercial capability matrix', () => {
    expect(buildSpokeduMasterAccessSnapshot({ row: null, isAdmin: false })).toMatchObject({
      plan: 'free',
      subscriptionStatus: 'none',
      ...CAPABILITY_MATRIX.free,
    });

    expect(buildSpokeduMasterAccessSnapshot({
      row: row({
        plan: 'lite',
        status: 'active',
        period_end: '2099-01-01T00:00:00.000Z',
      }),
      isAdmin: false,
    })).toMatchObject({
      plan: 'lite',
      subscriptionStatus: 'active',
      ...CAPABILITY_MATRIX.lite,
    });

    expect(buildSpokeduMasterAccessSnapshot({
      row: row({
        plan: 'premium',
        status: 'active',
        period_end: '2099-01-01T00:00:00.000Z',
      }),
      isAdmin: false,
    })).toMatchObject({
      plan: 'premium',
      subscriptionStatus: 'active',
      ...CAPABILITY_MATRIX.premium,
    });

    expect(buildSpokeduMasterAccessSnapshot({
      row: row({
        plan: 'premium',
        status: 'expired',
        period_end: '2020-01-01T00:00:00.000Z',
      }),
      isAdmin: false,
    })).toMatchObject({
      plan: 'premium',
      subscriptionStatus: 'expired',
      ...CAPABILITY_MATRIX.expired,
    });
  });

  it('keeps product catalog entitlements aligned with the same matrix', () => {
    expect(MASTER_PRODUCT_CATALOG.lite.featureEntitlements).toEqual(CAPABILITY_MATRIX.lite);
    expect(MASTER_PRODUCT_CATALOG.premium.featureEntitlements).toEqual(CAPABILITY_MATRIX.premium);
  });

  it('maps protected routes to the matrix capability keys', () => {
    expect(getMasterRouteRequirement('/spokedu-master/library').capability).toBe('library');
    expect(getMasterRouteRequirement('/spokedu-master/programs').capability).toBe('library');
    expect(getMasterRouteRequirement('/spokedu-master/favorites').capability).toBe('library');
    expect(getMasterRouteRequirement('/spokedu-master/manage').capability).toBe('attendance');
    expect(getMasterRouteRequirement('/spokedu-master/class-tools').capability).toBe('classTools');
    expect(getMasterRouteRequirement('/spokedu-master/class-record').capability).toBe('records');
    expect(getMasterRouteRequirement('/spokedu-master/activity').capability).toBe('attendance');
    expect(getMasterRouteRequirement('/spokedu-master/classes').capability).toBe('attendance');
    expect(getMasterRouteRequirement('/spokedu-master/students').capability).toBe('attendance');
    expect(getMasterRouteRequirement('/spokedu-master/students/student-a').capability).toBe('records');
    expect(getMasterRouteRequirement('/spokedu-master/report').capability).toBe('records');
    expect(getMasterRouteRequirement('/spokedu-master/spomove').capability).toBe('library');
    expect(getMasterRouteRequirement('/spokedu-master/spomove/session').capability).toBe('spomove');
    expect(getMasterRouteRequirement('/spokedu-master/dashboard').capability).toBe('authenticated');
  });

  it('keeps TabBar and AppShell capability checks on the same snapshot flags', () => {
    const tabBar = read('app/spokedu-master/components/layout/TabBar.tsx');
    const appShell = read('app/spokedu-master/components/layout/AppShell.tsx');

    for (const source of [tabBar, appShell]) {
      expect(source).toContain("capability === 'library'");
      expect(source).toContain('snapshot.canUseLibrary');
      expect(source).toContain("capability === 'classTools'");
      expect(source).toContain('snapshot.canUseClassTools');
      expect(source).toContain("capability === 'attendance'");
      expect(source).toContain('snapshot.canUseAttendance');
      expect(source).toContain("capability === 'records'");
      expect(source).toContain('snapshot.canUseRecords');
      expect(source).toContain('snapshot.canUseSpomove');
    }
  });

  it('keeps GateWall copy honest for Lite→Premium records/SPOMOVE and expired renewals', () => {
    const gate = read('app/spokedu-master/components/ui/SubscriptionGateWall.tsx');
    expect(gate).toContain('기록 누적은 프리미엄에서 이용할 수 있습니다');
    expect(gate).toContain('이미 쌓인 기록은 유지됩니다');
    expect(gate).toContain('SPOMOVE는 프리미엄에서 이용할 수 있습니다');
    expect(gate).toContain('수업 도구를 다시 쓰려면 이용권이 필요합니다');
    expect(gate).toContain('spm-btn-primary');
  });

  it('keeps landing Lite includes honest to the matrix (no records on Lite)', () => {
    const landing = read('app/spokedu-master/landing/page.tsx');
    expect(landing).toContain('getMasterProductPaymentFeatureLabels(MASTER_PRODUCT_CATALOG.lite)');
    expect(landing).toContain('getMasterProductPaymentFeatureLabels(MASTER_PRODUCT_CATALOG.premium)');

    const lite = getMasterProductPaymentFeatureLabels(MASTER_PRODUCT_CATALOG.lite).join(' ');
    const premium = getMasterProductPaymentFeatureLabels(MASTER_PRODUCT_CATALOG.premium).join(' ');
    expect(lite).toContain('출석');
    expect(lite).not.toContain('안내문 작성·복사');
    expect(lite).not.toContain('SPOMOVE');
    expect(premium).toContain('안내문 작성·복사');
    expect(premium).toContain('SPOMOVE');
  });
});
