import type { SpomoveMovementGuideDraft } from './spomoveGuideContract';
import type { SpomovePresetContentOverride } from './spomoveOfficialAssets';

/** Neutral editorial seed shape for CMS batch merge (not Public runtime). */
export type SpomoveGuideSeedBase = {
  presetId: string;
  movementGuide: SpomoveMovementGuideDraft;
  /** When true, non-blank seed fields overwrite existing CMS guide fields (REFINE). */
  overwriteGuideFields?: boolean;
};

function isBlankGuideValue(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (typeof value === 'string') return !value.trim();
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

/** Merge seed guide into existing override. Default: existing non-blank wins. */
export function mergeSpomoveGuideSeedOverride(
  current: SpomovePresetContentOverride | undefined,
  seed: SpomoveGuideSeedBase,
): SpomovePresetContentOverride {
  const existingGuide = current?.movementGuide ?? {};
  const mergedGuide: SpomoveMovementGuideDraft = { ...existingGuide };
  for (const [key, value] of Object.entries(seed.movementGuide) as Array<
    [keyof SpomoveMovementGuideDraft, SpomoveMovementGuideDraft[keyof SpomoveMovementGuideDraft]]
  >) {
    if (seed.overwriteGuideFields || isBlankGuideValue(mergedGuide[key])) {
      (mergedGuide as Record<string, unknown>)[key] = value;
    }
  }
  return {
    ...current,
    movementGuide: mergedGuide,
    movementGuideStatus: current?.movementGuideStatus ?? 'draft',
  };
}
