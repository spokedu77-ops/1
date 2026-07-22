import { describe, expect, it } from 'vitest';
import { mergeOperationConfig } from './operationMerge';
import { validateOperationConfig, resolveRequiredMatGuidance } from './operationConstraints';
import { getOperationProfile } from './operationProfiles';
import { resolveOperationLayer } from './operationResolve';
import { migrateLegacyStartPosition } from './operationTypes';
import {
  preferenceStorageKey,
  readPresetConfigPreference,
  removePresetConfigPreference,
  writePresetConfigPreference,
} from './presetConfigPreferenceStorage';
import { listActivityFamilies } from '../movements/activityFamilies';
import { OFFICIAL_SPOMOVE_LIBRARY, OFFICIAL_SPOMOVE_LIBRARY_SIZE } from '../officialSpomovePresets';

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

describe('operation merge', () => {
  it('merges nested equipment without dropping sibling axes', () => {
    const profile = getOperationProfile('immediateResponse');
    const merged = mergeOperationConfig(profile.defaultConfig, {
      equipment: { mode: 'connect', equipmentId: 'band' },
      participantScale: 'pair',
    });
    expect(merged.equipment).toEqual({ mode: 'connect', equipmentId: 'band' });
    expect(merged.participantScale).toBe('pair');
    expect(merged.timing).toEqual(profile.defaultConfig.timing);
  });

  it('replaces timing only when a complete union is provided', () => {
    const profile = getOperationProfile('immediateResponse');
    const merged = mergeOperationConfig(profile.defaultConfig, {
      timing: { pattern: 'interval', workSeconds: 20, restSeconds: 10, sets: 3 },
    });
    expect(merged.timing).toEqual({ pattern: 'interval', workSeconds: 20, restSeconds: 10, sets: 3 });
  });
});

describe('operation constraints', () => {
  it('sanitizes individual + cooperative to independent', () => {
    const profile = getOperationProfile('immediateResponse');
    const result = validateOperationConfig({
      profile,
      official: profile.defaultConfig,
      config: {
        ...profile.defaultConfig,
        participationFormat: 'cooperative',
      },
    });
    expect(result.config.participationFormat).toBe('independent');
    expect(result.status).toBe('sanitized');
  });

  it('sanitizes unsupported interval to continuous when capability is off', () => {
    const profile = getOperationProfile('immediateResponse');
    const declared = mergeOperationConfig(profile.defaultConfig, {
      timing: { pattern: 'interval', workSeconds: 20, restSeconds: 10, sets: 3 },
    });
    const result = validateOperationConfig({
      profile,
      official: declared,
      config: declared,
      capabilities: { interval: false, shuttle: false },
    });
    expect(result.config.timing.pattern).toBe('continuous');
    expect(result.issues.some((i) => i.code === 'unsupportedTimingPattern')).toBe(true);
  });
});

describe('legacyFixed sentinel', () => {
  it('resolves to legacyDisabled without exposing operation layer', () => {
    const layer = resolveOperationLayer({
      familyOperationProfileId: 'legacyFixed',
      activityFamilyId: 'visual-flow',
    });
    expect(layer.status).toBe('legacyDisabled');
    expect(getOperationProfile('legacyFixed').exposure).toBe('legacyDisabled');
  });
});

describe('migrateLegacyStartPosition', () => {
  it('maps behindMat to adjacentToMat', () => {
    expect(migrateLegacyStartPosition('behindMat')).toBe('adjacentToMat');
    expect(migrateLegacyStartPosition('onMat')).toBe('onMat');
  });
});

describe('preset preference storage', () => {
  it('keeps preference keys independent per preset', () => {
    const storage = memoryStorage();
    const colorId = 'reaction-cognition-full-color-03';
    const fruitId = 'reaction-cognition-l3-fruit-exp';
    expect(preferenceStorageKey(colorId)).not.toBe(preferenceStorageKey(fruitId));

    writePresetConfigPreference(
      colorId,
      {
        schemaVersion: 1,
        presetId: colorId,
        movement: { baseMovement: 'footTap', limbRule: 'free' },
      },
      storage,
    );
    writePresetConfigPreference(
      fruitId,
      {
        schemaVersion: 1,
        presetId: fruitId,
        movement: { baseMovement: 'handTouch', limbRule: 'free' },
      },
      storage,
    );

    expect(readPresetConfigPreference(colorId, storage)?.movement?.baseMovement).toBe('footTap');
    expect(readPresetConfigPreference(fruitId, storage)?.movement?.baseMovement).toBe('handTouch');
    removePresetConfigPreference(colorId, storage);
    expect(readPresetConfigPreference(colorId, storage)).toBeNull();
    expect(readPresetConfigPreference(fruitId, storage)?.movement?.baseMovement).toBe('handTouch');
  });
});

describe('mat guidance', () => {
  it('recommends scale defaults when participant count unknown', () => {
    expect(resolveRequiredMatGuidance({ minMats: 1, participantScale: 'pair' }).recommended).toBe(2);
    expect(resolveRequiredMatGuidance({ minMats: 1, participantScale: 'smallGroup' }).recommended).toBe(4);
  });
});

describe('O1 family operationProfileId + library size invariant', () => {
  it('assigns operationProfileId to every activity family', () => {
    for (const family of listActivityFamilies()) {
      expect(family.operationProfileId).toBeTruthy();
    }
  });

  it('does not change official library size', () => {
    expect(OFFICIAL_SPOMOVE_LIBRARY).toHaveLength(OFFICIAL_SPOMOVE_LIBRARY_SIZE);
  });
});
