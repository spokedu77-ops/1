import { describe, expect, it } from 'vitest';

import { OFFICIAL_SPOMOVE_LIBRARY } from '../officialSpomovePresets';
import { getActivityFamily } from '../movements/activityFamilies';
import { getMovementProfile } from '../movements/movementProfiles';
import { listAllowedMovementPicks } from '../movements/movementResolve';
import {
  beginMovementRun,
  changePausedMovement,
  movementRuntimeSupport,
  type SessionMovementState,
} from './sessionMovementLifecycle';

const foot = { baseMovement: 'footTap', limbRule: 'free' } as const;
const hand = { baseMovement: 'handTouch', limbRule: 'free' } as const;
const hold = { baseMovement: 'stepHold', limbRule: 'free' } as const;

describe('SPOMOVE runtime movement lifecycle', () => {
  it('maps every official preset to an explicit movement support policy', () => {
    const familyCounts = {
      supported: new Set<string>(),
      unsupported: new Set<string>(),
      not_applicable: new Set<string>(),
    };
    const presetCounts = { supported: 0, unsupported: 0, not_applicable: 0 };

    for (const preset of OFFICIAL_SPOMOVE_LIBRARY) {
      expect(preset.activityFamilyId, preset.id).toBeTruthy();
      expect(preset.movementProfileId, preset.id).toBeTruthy();
      const family = getActivityFamily(preset.activityFamilyId!);
      const profile = getMovementProfile(preset.movementProfileId!);
      expect(family, preset.id).toBeTruthy();
      expect(profile, preset.id).toBeTruthy();
      const support = movementRuntimeSupport(profile);
      familyCounts[support].add(preset.activityFamilyId!);
      presetCounts[support] += 1;
      if (support === 'supported') {
        expect(listAllowedMovementPicks(profile!, family).length, preset.id).toBeGreaterThan(1);
      }
    }

    expect(OFFICIAL_SPOMOVE_LIBRARY).toHaveLength(100);
    expect(presetCounts).toEqual({ supported: 91, unsupported: 4, not_applicable: 5 });
    expect({
      supported: familyCounts.supported.size,
      unsupported: familyCounts.unsupported.size,
      not_applicable: familyCounts.not_applicable.size,
    }).toEqual({ supported: 25, unsupported: 3, not_applicable: 2 });
  });

  it('records ordered changes against active elapsed time and ignores the same movement', () => {
    const initial: SessionMovementState = {
      initialMovement: foot,
      currentMovement: foot,
      movementChanges: [],
    };
    const unchanged = changePausedMovement(initial, foot, 20_000);
    expect(unchanged).toBe(initial);

    const second = changePausedMovement(unchanged, hand, 20_000);
    const third = changePausedMovement(second, hold, 40_000);
    expect(third.currentMovement).toEqual(hold);
    expect(third.movementChanges).toEqual([
      { from: foot, to: hand, activeElapsedMs: 20_000 },
      { from: hand, to: hold, activeElapsedMs: 40_000 },
    ]);
  });

  it('uses the final movement as the mounted rerun initial movement', () => {
    const previous = changePausedMovement({
      initialMovement: foot,
      currentMovement: foot,
      movementChanges: [],
    }, hand, 10_000);
    expect(beginMovementRun(previous)).toEqual({
      initialMovement: hand,
      currentMovement: hand,
      movementChanges: [],
    });
  });
});
