import { describe, expect, it } from 'vitest';
import type { MasterAccessSnapshot } from './masterAccessModel';
import { canAccessSpomovePreset, resolveLiteSpomoveTrialPresetId } from './spomoveTrialAccess';
import { OFFICIAL_SPOMOVE_LIBRARY } from '../spomove/officialSpomovePresets';
import { isHubRunnablePreset } from '../spomove/movements/isHubVisiblePreset';

const runnable = OFFICIAL_SPOMOVE_LIBRARY.find(isHubRunnablePreset)!;
const another = OFFICIAL_SPOMOVE_LIBRARY.find((preset) => isHubRunnablePreset(preset) && preset.id !== runnable.id)!;

function snapshot(overrides: Partial<MasterAccessSnapshot>): MasterAccessSnapshot {
  return {
    authenticated: true,
    onboardingDone: true,
    plan: 'lite',
    subscriptionStatus: 'active',
    currentPeriodEnd: '2099-01-01T00:00:00.000Z',
    cancelAtPeriodEnd: false,
    isAdmin: false,
    isCenterOrTeam: false,
    canBrowseLibrary: true,
    canUseLibrary: true,
    freePreviewProgramIds: ['68'],
    canUseClassTools: true,
    canUseAttendance: true,
    canUseRecords: true,
    canUseSpomove: false,
    spomoveTrialPresetId: runnable.id,
    ...overrides,
  };
}

describe('Lite weekly SPOMOVE access', () => {
  it('uses only an explicit runnable first slot and never an automatic fallback', () => {
    expect(resolveLiteSpomoveTrialPresetId([runnable.id, another.id])).toBe(runnable.id);
    expect(resolveLiteSpomoveTrialPresetId([null, runnable.id])).toBeNull();
    expect(resolveLiteSpomoveTrialPresetId(['not-a-preset'])).toBeNull();
  });

  it('allows active Lite only for the exact trial preset', () => {
    expect(canAccessSpomovePreset(snapshot({}), runnable.id)).toBe(true);
    expect(canAccessSpomovePreset(snapshot({}), another.id)).toBe(false);
    expect(canAccessSpomovePreset(snapshot({ subscriptionStatus: 'expired' }), runnable.id)).toBe(false);
    expect(canAccessSpomovePreset(snapshot({ subscriptionStatus: 'cancelled' }), runnable.id)).toBe(false);
    expect(canAccessSpomovePreset(snapshot({ plan: 'free' }), runnable.id)).toBe(false);
  });

  it('preserves full SPOMOVE access for Premium, Team, and Admin snapshots', () => {
    expect(canAccessSpomovePreset(snapshot({ plan: 'premium', canUseSpomove: true }), another.id)).toBe(true);
    expect(canAccessSpomovePreset(snapshot({ plan: 'team', canUseSpomove: true }), another.id)).toBe(true);
    expect(canAccessSpomovePreset(snapshot({ plan: 'team', isAdmin: true, canUseSpomove: true }), another.id)).toBe(true);
  });
});
