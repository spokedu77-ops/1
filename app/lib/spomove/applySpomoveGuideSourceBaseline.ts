import type { OfficialSpomovePreset } from '@/app/spokedu-master/spomove/officialSpomovePresets';
import { resolveSpomoveBriefingReadiness } from './spomoveBriefingReadiness';
import {
  guideBodyFingerprint,
  resolveSpomoveGuideSourceIntegrity,
  withPublishedSourceBaseline,
} from './spomoveGuideSourceIntegrity';
import type { SpomovePresetContentOverride } from './spomoveOfficialAssets';

export type SpomoveGuideSourceBaselineRow = {
  presetId: string;
  commercialReadiness: ReturnType<typeof resolveSpomoveBriefingReadiness>['readiness'];
  sourceStatus: ReturnType<typeof resolveSpomoveGuideSourceIntegrity>['status'];
  bootstrapEligible: boolean;
  currentFingerprint: string;
  publishedValid: boolean;
};

export type SpomoveGuideSourceBaselineApplyResult = {
  beforeEntryCount: number;
  afterEntryCount: number;
  changedPresetIds: string[];
  content: Record<string, SpomovePresetContentOverride>;
  guideBodyBeforeById: Record<string, string>;
  guideBodyAfterById: Record<string, string>;
};

function entryFingerprint(entry: SpomovePresetContentOverride | undefined): string {
  return JSON.stringify(entry ?? null);
}

function isPublishedValid(entry: SpomovePresetContentOverride | undefined): boolean {
  return entry?.movementGuideStatus === 'published' && Boolean(entry.movementGuide);
}

/**
 * Dry-run rows for source fingerprint bootstrap.
 * Eligible: Published Valid + Commercial Ready + no fingerprint.
 */
export function planSpomoveGuideSourceBaseline({
  presets,
  content,
}: {
  presets: readonly OfficialSpomovePreset[];
  content: Record<string, SpomovePresetContentOverride | undefined>;
}): SpomoveGuideSourceBaselineRow[] {
  return presets.map((preset) => {
    const entry = content[preset.id];
    const { readiness } = resolveSpomoveBriefingReadiness({
      preset,
      contentOverride: entry,
    });
    const integrity = resolveSpomoveGuideSourceIntegrity({
      preset,
      contentOverride: entry,
    });
    const publishedValid = isPublishedValid(entry);
    return {
      presetId: preset.id,
      commercialReadiness: readiness,
      sourceStatus: integrity.status,
      bootstrapEligible:
        publishedValid && readiness === 'ready' && integrity.status === 'untracked' && !entry?.sourceFingerprint,
      currentFingerprint: integrity.currentFingerprint,
      publishedValid,
    };
  });
}

/**
 * Merge-only: attach sourceFingerprint / version / reviewedAt.
 * Guide body fields must remain identical (asserted by caller via guideBody fingerprints).
 */
export function applySpomoveGuideSourceBaseline({
  current,
  presets,
  eligiblePresetIds,
  reviewedAt = new Date().toISOString(),
}: {
  current: Record<string, SpomovePresetContentOverride | undefined>;
  presets: readonly OfficialSpomovePreset[];
  eligiblePresetIds: readonly string[];
  reviewedAt?: string;
}): SpomoveGuideSourceBaselineApplyResult {
  const allowed = new Set(eligiblePresetIds);
  const presetById = new Map(presets.map((p) => [p.id, p] as const));
  const content: Record<string, SpomovePresetContentOverride> = {};
  for (const [id, entry] of Object.entries(current)) {
    if (entry) content[id] = { ...entry };
  }

  const beforeFingerprints = new Map(
    Object.keys(content).map((id) => [id, entryFingerprint(content[id])] as const),
  );
  const guideBodyBeforeById: Record<string, string> = {};
  for (const id of Object.keys(content)) {
    guideBodyBeforeById[id] = guideBodyFingerprint(content[id]);
  }

  const beforeEntryCount = Object.keys(content).length;
  const changedPresetIds: string[] = [];

  for (const presetId of eligiblePresetIds) {
    const preset = presetById.get(presetId);
    if (!preset) throw new Error(`Missing preset for baseline: ${presetId}`);
    const before = content[presetId];
    if (!before) throw new Error(`Missing CMS entry for baseline: ${presetId}`);
    if (!isPublishedValid(before)) {
      throw new Error(`Baseline requires Published Valid: ${presetId}`);
    }
    const next = withPublishedSourceBaseline(preset, { ...before }, reviewedAt);
    content[presetId] = next;
    if (entryFingerprint(next) !== entryFingerprint(before)) changedPresetIds.push(presetId);
  }

  for (const id of Object.keys(content)) {
    if (allowed.has(id)) continue;
    if (entryFingerprint(content[id]) !== beforeFingerprints.get(id)) {
      throw new Error(`Non-eligible CMS entry changed unexpectedly: ${id}`);
    }
  }

  for (const id of beforeFingerprints.keys()) {
    if (!content[id]) throw new Error(`CMS entry removed during baseline: ${id}`);
  }

  const guideBodyAfterById: Record<string, string> = {};
  for (const id of Object.keys(content)) {
    guideBodyAfterById[id] = guideBodyFingerprint(content[id]);
    if (guideBodyAfterById[id] !== guideBodyBeforeById[id]) {
      throw new Error(`Guide body mutated during source baseline: ${id}`);
    }
  }

  return {
    beforeEntryCount,
    afterEntryCount: Object.keys(content).length,
    changedPresetIds,
    content,
    guideBodyBeforeById,
    guideBodyAfterById,
  };
}
