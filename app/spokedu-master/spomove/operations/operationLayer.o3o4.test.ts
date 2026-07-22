import { describe, expect, it } from 'vitest';

import { mergeOperationConfig } from './operationMerge';
import { getOperationProfile } from './operationProfiles';
import { parseOperationQuery, writeOperationQuery } from './operationQuery';
import {
  buildDeclaredOperation,
  resolveOperationEngineCapabilities,
  resolveOperationLayer,
} from './operationResolve';
import {
  buildSpomoveSessionSnapshotV2,
  operationConfigToPatch,
  timingPatternsForCapabilities,
} from './operationSessionHelpers';
import {
  readPresetConfigPreference,
  removePresetConfigPreference,
  writePresetConfigPreference,
} from './presetConfigPreferenceStorage';
import { validateOperationConfig } from './operationConstraints';

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
  };
}

describe('O3 operation query', () => {
  it('round-trips continuous and interval', () => {
    const continuous = buildDeclaredOperation('immediateResponse', {
      timing: { pattern: 'continuous' },
    });
    const params = writeOperationQuery(continuous);
    expect(params.get('opv')).toBe('1');
    expect(parseOperationQuery(params)?.timing).toEqual({ pattern: 'continuous' });

    const interval = mergeOperationConfig(continuous, {
      timing: { pattern: 'interval', workSeconds: 20, restSeconds: 10, sets: 3 },
    });
    const ip = writeOperationQuery(interval);
    expect(parseOperationQuery(ip)?.timing).toEqual({
      pattern: 'interval',
      workSeconds: 20,
      restSeconds: 10,
      sets: 3,
    });
  });
});

describe('O3 Preference never stores sanitized effective', () => {
  it('keeps interval candidate in preference while capability sanitizes engine', () => {
    const storage = memoryStorage();
    const presetId = 'reaction-cognition-l3-food-exp';
    const profile = getOperationProfile('immediateResponse');
    const declared = buildDeclaredOperation('immediateResponse', {
      timing: { pattern: 'interval', workSeconds: 20, restSeconds: 10, sets: 3 },
    });
    const candidate = declared;
    writePresetConfigPreference(
      presetId,
      {
        schemaVersion: 1,
        presetId,
        operationPatch: operationConfigToPatch(candidate),
      },
      storage,
    );

    const pref = readPresetConfigPreference(presetId, storage);
    expect(pref?.operationPatch?.timing).toEqual({
      pattern: 'interval',
      workSeconds: 20,
      restSeconds: 10,
      sets: 3,
    });

    const layer = resolveOperationLayer({
      familyOperationProfileId: 'immediateResponse',
      recommendedOperation: { timing: { pattern: 'interval', workSeconds: 20, restSeconds: 10, sets: 3 } },
      preference: pref,
      capabilities: { interval: false, shuttle: false },
    });
    expect(layer.candidate.timing.pattern).toBe('interval');
    expect(layer.effective.timing.pattern).not.toBe('interval');
    expect(layer.status).toBe('sanitized');

    // Preferenceremains interval (caller must not write effective back)
    const still = readPresetConfigPreference(presetId, storage);
    expect(still?.operationPatch?.timing?.pattern).toBe('interval');
    removePresetConfigPreference(presetId, storage);

    const hidden = timingPatternsForCapabilities(profile, { interval: false, shuttle: false });
    expect(hidden).not.toContain('interval');
  });
});

describe('O3 Snapshot V2 discriminated union', () => {
  it('omits operation when legacyDisabled', () => {
    const snap = buildSpomoveSessionSnapshotV2({
      presetId: 'x',
      movement: null,
      operationLayerStatus: 'legacyDisabled',
      cueSeconds: 3,
    });
    expect(snap.operationLayerStatus).toBe('legacyDisabled');
    expect('operation' in snap && (snap as { operation?: unknown }).operation).toBeFalsy();
  });

  it('requires operation when ready', () => {
    const op = buildDeclaredOperation('immediateResponse');
    const snap = buildSpomoveSessionSnapshotV2({
      presetId: 'x',
      movement: { baseMovement: 'twoLegJump', limbRule: 'free' },
      operationLayerStatus: 'ready',
      operation: op,
      cueSeconds: 3,
    });
    expect(snap.operationLayerStatus).toBe('ready');
    if (snap.operationLayerStatus !== 'legacyDisabled') {
      expect(snap.operation.timing.pattern).toBeTruthy();
    }
  });
});

describe('O4 MemoryGame interval capability', () => {
  it('enables interval for basic and keeps continuous when not requested', () => {
    expect(resolveOperationEngineCapabilities('basic').interval).toBe(true);
    expect(resolveOperationEngineCapabilities('reactTrain').interval).toBe(false);
    expect(resolveOperationEngineCapabilities('spatial').interval).toBe(false);

    const layer = resolveOperationLayer({
      familyOperationProfileId: 'immediateResponse',
      recommendedOperation: {
        timing: { pattern: 'interval', workSeconds: 20, restSeconds: 10, sets: 3 },
      },
      capabilities: resolveOperationEngineCapabilities('basic'),
    });
    expect(layer.effective.timing).toEqual({
      pattern: 'interval',
      workSeconds: 20,
      restSeconds: 10,
      sets: 3,
    });

    const continuous = resolveOperationLayer({
      familyOperationProfileId: 'immediateResponse',
      recommendedOperation: { timing: { pattern: 'continuous' } },
      capabilities: resolveOperationEngineCapabilities('basic'),
    });
    expect(continuous.effective.timing.pattern).toBe('continuous');
    expect(continuous.status).toBe('ready');
  });

  it('validates interval complete fields', () => {
    const profile = getOperationProfile('immediateResponse');
    const official = buildDeclaredOperation('immediateResponse');
    const result = validateOperationConfig({
      profile,
      config: mergeOperationConfig(official, {
        timing: { pattern: 'interval', workSeconds: 20, restSeconds: 10, sets: 3 },
      }),
      official,
      capabilities: { interval: true, shuttle: false },
    });
    expect(result.status).toBe('valid');
  });
});
