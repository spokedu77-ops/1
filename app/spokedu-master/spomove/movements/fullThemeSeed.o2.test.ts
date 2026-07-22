import { describe, expect, it } from 'vitest';
import {
  FULL_THEME_SEED_PRESET_IDS,
  FULL_THEME_SEEDS,
} from '../operations/fullThemeSeed';
import {
  preferenceStorageKey,
  readPresetConfigPreference,
  writePresetConfigPreference,
} from '../operations/presetConfigPreferenceStorage';
import { findOfficialSpomovePreset, OFFICIAL_SPOMOVE_LIBRARY } from '../officialSpomovePresets';
import { getActivityFamily } from './activityFamilies';
import { getMovementProfile } from './movementProfiles';
import { resolveOfficialRecommended } from './movementResolve';

function memoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => {
      map.set(k, String(v));
    },
    removeItem: (k) => {
      map.delete(k);
    },
    key: (i) => [...map.keys()][i] ?? null,
  } as Storage;
}

describe('O2 full theme seed', () => {
  it('keeps reaction-full on themedFullResponse profile', () => {
    const family = getActivityFamily('reaction-full');
    expect(family?.movementProfileId).toBe('themedFullResponse');
    expect(getMovementProfile('themedFullResponse')?.alternatives.some((a) => a.baseMovement === 'twoLegJump')).toBe(
      true,
    );
  });

  it('applies distinct recommended movement per full theme preset', () => {
    const expected: Record<string, string> = {
      'reaction-cognition-full-color-03': 'twoLegJump',
      'reaction-cognition-l3-fruit-exp': 'singleLegHop',
      'reaction-cognition-full-animal-18': 'boundingStep',
      'reaction-cognition-full-nature-19': 'lungeReach',
      'reaction-cognition-l3-food-exp': 'quickStep',
      'reaction-cognition-l3-vehicle-exp': 'plankTouch',
    };
    for (const id of FULL_THEME_SEED_PRESET_IDS) {
      const preset = findOfficialSpomovePreset(id);
      expect(preset, id).toBeTruthy();
      expect(preset!.recommendedMovement?.baseMovement).toBe(expected[id]);
      expect(preset!.recommendedOperation).toBeTruthy();
    }
  });

  it('resolves official recommended from preset before family', () => {
    const family = getActivityFamily('reaction-full')!;
    const profile = getMovementProfile(family.movementProfileId)!;
    const fruit = findOfficialSpomovePreset('reaction-cognition-l3-fruit-exp')!;
    const color = findOfficialSpomovePreset('reaction-cognition-full-color-03')!;
    expect(
      resolveOfficialRecommended(family, profile, {
        presetRecommendedMovement: fruit.recommendedMovement,
      }).baseMovement,
    ).toBe('singleLegHop');
    expect(
      resolveOfficialRecommended(family, profile, {
        presetRecommendedMovement: color.recommendedMovement,
      }).baseMovement,
    ).toBe('twoLegJump');
  });

  it('declares food timing as interval (Engine capability still off until O4)', () => {
    expect(FULL_THEME_SEEDS.food.recommendedOperation.timing?.pattern).toBe('interval');
    const food = findOfficialSpomovePreset('reaction-cognition-l3-food-exp')!;
    expect(food.recommendedOperation?.timing?.pattern).toBe('interval');
  });

  it('keeps preference keys independent across full theme presets', () => {
    const storage = memoryStorage();
    const colorId = 'reaction-cognition-full-color-03';
    const fruitId = 'reaction-cognition-l3-fruit-exp';
    expect(preferenceStorageKey(colorId)).not.toBe(preferenceStorageKey(fruitId));
    writePresetConfigPreference(
      colorId,
      { schemaVersion: 1, presetId: colorId, movement: { baseMovement: 'footTap', limbRule: 'free' } },
      storage,
    );
    writePresetConfigPreference(
      fruitId,
      { schemaVersion: 1, presetId: fruitId, movement: { baseMovement: 'handTouch', limbRule: 'free' } },
      storage,
    );
    expect(readPresetConfigPreference(colorId, storage)?.movement?.baseMovement).toBe('footTap');
    expect(readPresetConfigPreference(fruitId, storage)?.movement?.baseMovement).toBe('handTouch');
  });

  it('does not inflate library via seed apply', () => {
    expect(OFFICIAL_SPOMOVE_LIBRARY.length).toBeGreaterThan(6);
    for (const id of FULL_THEME_SEED_PRESET_IDS) {
      expect(OFFICIAL_SPOMOVE_LIBRARY.some((p) => p.id === id)).toBe(true);
    }
  });
});
