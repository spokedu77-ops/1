import { describe, expect, it } from 'vitest';
import type { MasterAccessSnapshot } from '../lib/masterAccessModel';
import { resolveDashboardPrimaryAction } from './dashboardPrimaryAction';

const base: MasterAccessSnapshot = {
  authenticated: true,
  onboardingDone: true,
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
  spomoveTrialPresetId: null,
};

describe('Dashboard primary CTA', () => {
  it('uses the free preview only when it exists', () => {
    expect(resolveDashboardPrimaryAction({ access: base, hasFreePreview: true, nextSessionHref: null })).toEqual({ kind: 'freePreview', label: '무료 수업 보기' });
    expect(resolveDashboardPrimaryAction({ access: base, hasFreePreview: false, nextSessionHref: null })).toEqual({ kind: 'link', label: '놀이체육 둘러보기', href: '/spokedu-lab/library' });
  });

  it('prioritizes the next session over the Lite trial', () => {
    const access = { ...base, plan: 'lite' as const, subscriptionStatus: 'active' as const, spomoveTrialPresetId: 'dive-standard' };
    expect(resolveDashboardPrimaryAction({ access, hasFreePreview: true, nextSessionHref: '/spokedu-lab/activity?session=1' })).toEqual({ kind: 'link', label: '다음 수업 준비', href: '/spokedu-lab/activity?session=1' });
    expect(resolveDashboardPrimaryAction({ access, hasFreePreview: true, nextSessionHref: null })).toEqual({ kind: 'liteSpomoveTrial', label: '이번 주 SPOMOVE 체험', presetId: 'dive-standard' });
  });

  it('falls back to Library for Lite without a trial and full plans without a next session', () => {
    expect(resolveDashboardPrimaryAction({ access: { ...base, plan: 'lite', subscriptionStatus: 'active' }, hasFreePreview: true, nextSessionHref: null }).label).toBe('놀이체육 찾기');
    expect(resolveDashboardPrimaryAction({ access: { ...base, plan: 'premium', subscriptionStatus: 'active', canUseSpomove: true }, hasFreePreview: true, nextSessionHref: null }).label).toBe('놀이체육 찾기');
  });
});
