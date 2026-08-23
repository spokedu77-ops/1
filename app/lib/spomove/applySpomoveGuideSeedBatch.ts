import type { SpomoveMovementGuideStatus } from './spomoveGuideContract';
import type { SpomovePresetContentOverride } from './spomoveOfficialAssets';
import { mergeSpomoveGuideSeedOverride, type SpomoveGuideSeedBase } from './spomoveGuideSeedMerge';
import {
  SPOMOVE_REACTION_COGNITION_GUIDE_SEEDS,
  SPOMOVE_REACTION_COGNITION_SEED_PRESET_IDS,
  type SpomoveGuideSeedEntry,
} from './spomoveReactionCognitionGuides';

export type SpomoveGuideBatchApplyResult = {
  beforeEntryCount: number;
  afterEntryCount: number;
  changedPresetIds: string[];
  content: Record<string, SpomovePresetContentOverride>;
};

function entryFingerprint(entry: SpomovePresetContentOverride | undefined): string {
  return JSON.stringify(entry ?? null);
}

/**
 * Merge selected guide seeds into CMS map.
 * Only listed seed preset IDs may change. Other entries must stay identical.
 */
export function applySpomoveGuideSeedBatch({
  current,
  seeds,
  status,
  allowedPresetIds,
}: {
  current: Record<string, SpomovePresetContentOverride | undefined>;
  seeds: readonly SpomoveGuideSeedBase[];
  status: SpomoveMovementGuideStatus;
  allowedPresetIds: readonly string[];
}): SpomoveGuideBatchApplyResult {
  const allowed = new Set(allowedPresetIds);
  const content: Record<string, SpomovePresetContentOverride> = {};
  for (const [id, entry] of Object.entries(current)) {
    if (entry) content[id] = { ...entry };
  }

  const beforeFingerprints = new Map(
    Object.keys(content).map((id) => [id, entryFingerprint(content[id])] as const),
  );
  const beforeEntryCount = Object.keys(content).length;
  const changedPresetIds: string[] = [];

  for (const seed of seeds) {
    if (!allowed.has(seed.presetId)) {
      throw new Error(`Seed preset not in allowed batch: ${seed.presetId}`);
    }
    const before = entryFingerprint(content[seed.presetId]);
    const merged = mergeSpomoveGuideSeedOverride(content[seed.presetId], seed);
    const next: SpomovePresetContentOverride = {
      ...merged,
      movementGuideStatus: status,
    };
    content[seed.presetId] = next;
    if (entryFingerprint(next) !== before) changedPresetIds.push(seed.presetId);
  }

  for (const id of Object.keys(content)) {
    if (allowed.has(id)) continue;
    if (entryFingerprint(content[id]) !== beforeFingerprints.get(id)) {
      throw new Error(`Non-batch CMS entry changed unexpectedly: ${id}`);
    }
  }

  for (const id of beforeFingerprints.keys()) {
    if (allowed.has(id)) continue;
    if (!content[id] && beforeFingerprints.get(id) !== entryFingerprint(undefined)) {
      throw new Error(`Non-batch CMS entry removed: ${id}`);
    }
  }

  const unexpected = changedPresetIds.filter((id) => !allowed.has(id));
  if (unexpected.length > 0) {
    throw new Error(`Changed presets outside batch: ${unexpected.join(', ')}`);
  }

  return {
    beforeEntryCount,
    afterEntryCount: Object.keys(content).length,
    changedPresetIds,
    content,
  };
}

export function listReactionCognitionSeedsByCluster(
  cluster: SpomoveGuideSeedEntry['cluster'],
): SpomoveGuideSeedEntry[] {
  return SPOMOVE_REACTION_COGNITION_GUIDE_SEEDS.filter((entry) => entry.cluster === cluster);
}

export { SPOMOVE_REACTION_COGNITION_GUIDE_SEEDS, SPOMOVE_REACTION_COGNITION_SEED_PRESET_IDS };
