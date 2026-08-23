import type { OfficialSpomovePreset } from '@/app/spokedu-master/spomove/officialSpomovePresets';
import type { SpomovePresetContentOverride } from './spomoveOfficialAssets';
import {
  buildSpomoveGuideSourceFingerprint,
  SPOMOVE_GUIDE_SOURCE_FINGERPRINT_VERSION,
} from './spomoveGuideSourceFingerprint';
import { buildSpomoveGuideSemanticSnapshot } from './spomoveGuideSemanticSnapshot';

export type SpomoveGuideSourceIntegrityStatus = 'current' | 'changed' | 'untracked';

export type SpomoveGuideSourceIntegrity = {
  status: SpomoveGuideSourceIntegrityStatus;
  storedFingerprint: string | null;
  storedFingerprintVersion: number | null;
  currentFingerprint: string;
  sourceReviewedAt: string | null;
};

export function resolveSpomoveGuideSourceIntegrity({
  preset,
  contentOverride,
}: {
  preset: OfficialSpomovePreset;
  contentOverride?: SpomovePresetContentOverride;
}): SpomoveGuideSourceIntegrity {
  const currentFingerprint = buildSpomoveGuideSourceFingerprint(preset);
  const storedFingerprint =
    typeof contentOverride?.sourceFingerprint === 'string' && contentOverride.sourceFingerprint.trim()
      ? contentOverride.sourceFingerprint.trim()
      : null;
  const storedFingerprintVersion =
    typeof contentOverride?.sourceFingerprintVersion === 'number' &&
    Number.isFinite(contentOverride.sourceFingerprintVersion)
      ? contentOverride.sourceFingerprintVersion
      : null;
  const sourceReviewedAt =
    typeof contentOverride?.sourceReviewedAt === 'string' && contentOverride.sourceReviewedAt.trim()
      ? contentOverride.sourceReviewedAt.trim()
      : null;

  if (!storedFingerprint) {
    return {
      status: 'untracked',
      storedFingerprint: null,
      storedFingerprintVersion,
      currentFingerprint,
      sourceReviewedAt,
    };
  }

  // Unknown / older algorithm version → untracked (not "changed")
  if (
    storedFingerprintVersion != null &&
    storedFingerprintVersion !== SPOMOVE_GUIDE_SOURCE_FINGERPRINT_VERSION
  ) {
    return {
      status: 'untracked',
      storedFingerprint,
      storedFingerprintVersion,
      currentFingerprint,
      sourceReviewedAt,
    };
  }

  if (storedFingerprintVersion == null) {
    // Legacy missing version with fingerprint: treat as untracked until re-confirm
    return {
      status: 'untracked',
      storedFingerprint,
      storedFingerprintVersion: null,
      currentFingerprint,
      sourceReviewedAt,
    };
  }

  return {
    status: storedFingerprint === currentFingerprint ? 'current' : 'changed',
    storedFingerprint,
    storedFingerprintVersion,
    currentFingerprint,
    sourceReviewedAt,
  };
}

/** Attach/refresh baseline only on Published confirm. Draft save must call preserve. */
export function withPublishedSourceBaseline(
  preset: OfficialSpomovePreset,
  entry: SpomovePresetContentOverride,
  reviewedAt: string = new Date().toISOString(),
): SpomovePresetContentOverride {
  return {
    ...entry,
    sourceFingerprint: buildSpomoveGuideSourceFingerprint(preset),
    sourceFingerprintVersion: SPOMOVE_GUIDE_SOURCE_FINGERPRINT_VERSION,
    sourceReviewedAt: reviewedAt,
  };
}

/** Keep existing source baseline fields when saving Draft (or non-publish). */
export function preserveSourceBaselineFields(
  previous: SpomovePresetContentOverride | undefined,
  next: SpomovePresetContentOverride,
): SpomovePresetContentOverride {
  const out: SpomovePresetContentOverride = { ...next };
  if (previous?.sourceFingerprint) out.sourceFingerprint = previous.sourceFingerprint;
  else delete out.sourceFingerprint;
  if (typeof previous?.sourceFingerprintVersion === 'number') {
    out.sourceFingerprintVersion = previous.sourceFingerprintVersion;
  } else delete out.sourceFingerprintVersion;
  if (previous?.sourceReviewedAt) out.sourceReviewedAt = previous.sourceReviewedAt;
  else delete out.sourceReviewedAt;
  return out;
}

export function guideBodyFingerprint(entry: SpomovePresetContentOverride | undefined): string {
  const g = entry?.movementGuide;
  return JSON.stringify({
    objective: g?.objective ?? null,
    instruction: g?.instruction ?? null,
    coachScript: g?.coachScript ?? null,
    focusTags: g?.focusTags ?? null,
    teachingPoints: g?.teachingPoints ?? null,
    easier: g?.easier ?? null,
    harder: g?.harder ?? null,
    successCriteria: g?.successCriteria ?? null,
    commonMistake: g?.commonMistake ?? null,
    variations: g?.variations ?? null,
    movement: g?.movement ?? null,
  });
}

export function describeSemanticDrift(
  preset: OfficialSpomovePreset,
  previousSnapshotJson: string | null,
): Array<{ field: string; before: unknown; after: unknown }> {
  if (!previousSnapshotJson) return [];
  try {
    const before = JSON.parse(previousSnapshotJson) as Record<string, unknown>;
    const after = buildSpomoveGuideSemanticSnapshot(preset) as unknown as Record<string, unknown>;
    // Only compare engine shallow keys for Admin hint
    const diffs: Array<{ field: string; before: unknown; after: unknown }> = [];
    const bEng = (before.engine ?? {}) as Record<string, unknown>;
    const aEng = (after.engine ?? {}) as Record<string, unknown>;
    const keys = new Set([...Object.keys(bEng), ...Object.keys(aEng)]);
    for (const key of keys) {
      if (JSON.stringify(bEng[key]) !== JSON.stringify(aEng[key])) {
        diffs.push({ field: `engine.${key}`, before: bEng[key] ?? null, after: aEng[key] ?? null });
      }
    }
    return diffs.slice(0, 8);
  } catch {
    return [];
  }
}
