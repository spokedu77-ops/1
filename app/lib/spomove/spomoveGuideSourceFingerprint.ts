import type { OfficialSpomovePreset } from '@/app/spokedu-master/spomove/officialSpomovePresets';
import { hashStableValue } from './spomoveGuideSourceHash';
import { buildSpomoveGuideSemanticSnapshot } from './spomoveGuideSemanticSnapshot';
import {
  resolveSpomoveGuideSourceClustersForPreset,
  type SpomoveGuideSourceClusterId,
} from './spomoveGuideSourceManifest';
import { SPOMOVE_GUIDE_SOURCE_DIGESTS } from './generated/spomoveGuideSourceDigests.generated';

export const SPOMOVE_GUIDE_SOURCE_FINGERPRINT_VERSION = 1 as const;

export type SpomoveGuideSourceFingerprintPayload = {
  fingerprintVersion: typeof SPOMOVE_GUIDE_SOURCE_FINGERPRINT_VERSION;
  semanticSnapshot: ReturnType<typeof buildSpomoveGuideSemanticSnapshot>;
  runtimeSourceDigest: string;
  clusters: SpomoveGuideSourceClusterId[];
};

export function resolveRuntimeSourceDigestForPreset(preset: OfficialSpomovePreset): {
  clusters: SpomoveGuideSourceClusterId[];
  combinedDigest: string;
} {
  const clusters = resolveSpomoveGuideSourceClustersForPreset(preset);
  const parts = clusters.map((id) => {
    const digest = SPOMOVE_GUIDE_SOURCE_DIGESTS[id];
    if (!digest) {
      throw new Error(`Missing generated digest for cluster: ${id}`);
    }
    return `${id}:${digest}`;
  });
  return {
    clusters,
    combinedDigest: hashStableValue(parts),
  };
}

export function buildSpomoveGuideSourceFingerprintPayload(
  preset: OfficialSpomovePreset,
): SpomoveGuideSourceFingerprintPayload {
  const { clusters, combinedDigest } = resolveRuntimeSourceDigestForPreset(preset);
  return {
    fingerprintVersion: SPOMOVE_GUIDE_SOURCE_FINGERPRINT_VERSION,
    semanticSnapshot: buildSpomoveGuideSemanticSnapshot(preset),
    runtimeSourceDigest: combinedDigest,
    clusters,
  };
}

export function buildSpomoveGuideSourceFingerprint(preset: OfficialSpomovePreset): string {
  return hashStableValue(buildSpomoveGuideSourceFingerprintPayload(preset));
}

/** Test helper: fingerprint with injected cluster digests (no generated file mutation). */
export function buildSpomoveGuideSourceFingerprintWithDigests(
  preset: OfficialSpomovePreset,
  digests: Record<string, string>,
): string {
  const clusters = resolveSpomoveGuideSourceClustersForPreset(preset);
  const parts = clusters.map((id) => `${id}:${digests[id] ?? 'missing'}`);
  return hashStableValue({
    fingerprintVersion: SPOMOVE_GUIDE_SOURCE_FINGERPRINT_VERSION,
    semanticSnapshot: buildSpomoveGuideSemanticSnapshot(preset),
    runtimeSourceDigest: hashStableValue(parts),
    clusters,
  });
}
