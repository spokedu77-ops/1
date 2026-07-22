/**
 * Preset config preference storage (O1).
 * Session wiring is O3. Key independence tested in O1/O2.
 */
import type { PresetConfigPreferenceV1 } from './operationTypes';

const PREFERENCE_PREFIX = 'spokedu-master.spomove.preference.preset.';

export function preferenceStorageKey(presetId: string): string {
  return `${PREFERENCE_PREFIX}${presetId}`;
}

export function readPresetConfigPreference(
  presetId: string,
  storage: Pick<Storage, 'getItem'> | null = typeof window !== 'undefined' ? window.localStorage : null,
): PresetConfigPreferenceV1 | null {
  if (!storage || !presetId) return null;
  try {
    const raw = storage.getItem(preferenceStorageKey(presetId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PresetConfigPreferenceV1>;
    if (parsed.schemaVersion !== 1 || parsed.presetId !== presetId) return null;
    return {
      schemaVersion: 1,
      presetId,
      movement: parsed.movement,
      operationPatch: parsed.operationPatch,
      cueSeconds: parsed.cueSeconds,
      difficultyValue: parsed.difficultyValue,
    };
  } catch {
    return null;
  }
}

export function writePresetConfigPreference(
  presetId: string,
  preference: PresetConfigPreferenceV1,
  storage: Pick<Storage, 'setItem'> | null = typeof window !== 'undefined' ? window.localStorage : null,
): void {
  if (!storage || !presetId) return;
  try {
    const payload: PresetConfigPreferenceV1 = {
      ...preference,
      schemaVersion: 1,
      presetId,
    };
    storage.setItem(preferenceStorageKey(presetId), JSON.stringify(payload));
  } catch {
    // ignore quota / private mode
  }
}

export function removePresetConfigPreference(
  presetId: string,
  storage: Pick<Storage, 'removeItem'> | null = typeof window !== 'undefined' ? window.localStorage : null,
): void {
  if (!storage || !presetId) return;
  try {
    storage.removeItem(preferenceStorageKey(presetId));
  } catch {
    // ignore
  }
}
