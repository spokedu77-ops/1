/**
 * Admin CMS apply helper for SPOMOVE editorial pilots.
 * Not imported by Public runtime. Used by Admin UI / CMS apply tooling only.
 */
import {
  SPOMOVE_EDITORIAL_PILOT_CONTENT,
  SPOMOVE_EDITORIAL_PILOT_PRESET_IDS,
  mergeSpomoveEditorialPilotOverride,
  type SpomoveEditorialPilotPresetId,
} from './spomoveEditorialPilotContent';
import type { SpomovePresetContentOverride } from './spomoveOfficialAssets';
import type { SpomoveMovementGuideStatus } from './spomoveGuideContract';

export { SPOMOVE_EDITORIAL_PILOT_PRESET_IDS };

export type SpomovePilotCmsApplyResult = {
  beforeEntryCount: number;
  afterEntryCount: number;
  changedPresetIds: string[];
  content: Record<string, SpomovePresetContentOverride>;
};

function entryFingerprint(entry: SpomovePresetContentOverride | undefined): string {
  return JSON.stringify(entry ?? null);
}

/**
 * Merge pilot curated fields into existing CMS map.
 * Preserves all existing non-empty entry fields and non-blank guide fields.
 * Only Pilot preset IDs may appear in changedPresetIds.
 */
export function applySpomovePilotCmsMerge({
  current,
  status,
}: {
  current: Record<string, SpomovePresetContentOverride | undefined>;
  status: SpomoveMovementGuideStatus;
}): SpomovePilotCmsApplyResult {
  const beforeIds = new Set(Object.keys(current).filter((id) => current[id]));
  const content: Record<string, SpomovePresetContentOverride> = {};
  for (const [id, entry] of Object.entries(current)) {
    if (entry) content[id] = { ...entry };
  }

  const changedPresetIds: string[] = [];
  for (const pilot of SPOMOVE_EDITORIAL_PILOT_CONTENT) {
    const before = entryFingerprint(content[pilot.presetId]);
    const merged = mergeSpomoveEditorialPilotOverride(content[pilot.presetId], pilot);
    const next: SpomovePresetContentOverride = {
      ...merged,
      movementGuideStatus: status,
    };
    content[pilot.presetId] = next;
    if (entryFingerprint(next) !== before) {
      changedPresetIds.push(pilot.presetId);
    }
  }

  const unexpected = changedPresetIds.filter(
    (id) => !(SPOMOVE_EDITORIAL_PILOT_PRESET_IDS as readonly string[]).includes(id),
  );
  if (unexpected.length > 0) {
    throw new Error(`Pilot CMS merge changed non-pilot presets: ${unexpected.join(', ')}`);
  }

  return {
    beforeEntryCount: beforeIds.size,
    afterEntryCount: Object.keys(content).length,
    changedPresetIds,
    content,
  };
}

export function assertOnlyPilotPresetsChanged(
  before: Record<string, SpomovePresetContentOverride | undefined>,
  after: Record<string, SpomovePresetContentOverride>,
): SpomoveEditorialPilotPresetId[] {
  const beforeKeys = new Set(Object.keys(before));
  const afterKeys = new Set(Object.keys(after));
  const changed: string[] = [];

  for (const id of new Set([...beforeKeys, ...afterKeys])) {
    if (entryFingerprint(before[id]) !== entryFingerprint(after[id])) {
      changed.push(id);
    }
  }

  const unexpected = changed.filter(
    (id) => !(SPOMOVE_EDITORIAL_PILOT_PRESET_IDS as readonly string[]).includes(id),
  );
  if (unexpected.length > 0) {
    throw new Error(`Unexpected CMS changes outside Pilot set: ${unexpected.join(', ')}`);
  }
  return changed as SpomoveEditorialPilotPresetId[];
}
