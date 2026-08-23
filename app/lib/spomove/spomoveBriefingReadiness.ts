import type { OfficialSpomovePreset } from '@/app/spokedu-master/spomove/officialSpomovePresets';
import type { SpomovePresetContentOverride } from './spomoveOfficialAssets';
import { resolveSpomoveGuideContentState } from './spomoveGuideContentState';

/**
 * Admin/QA only — never expose these labels on Public Hub or briefing UI.
 *
 * Separates CMS "published" validity from commercial pre-start briefing quality.
 * Existing publication contract (movement/instruction/coachScript/focusTags/easier/harder)
 * stays unchanged; this layer adds objective + teachingPoints completeness.
 */
export type SpomoveBriefingReadiness =
  | 'ready'
  | 'needsEditorial'
  | 'legacy'
  | 'missing';

export type SpomoveBriefingEditorialGaps = {
  missingObjective: boolean;
  missingTeachingPoints: boolean;
  missingInstruction: boolean;
  missingFocusTags: boolean;
};

export type SpomoveBriefingReadinessResult = {
  readiness: SpomoveBriefingReadiness;
  gaps: SpomoveBriefingEditorialGaps;
};

function hasText(value: string | null | undefined): boolean {
  return Boolean(value?.trim());
}

export function resolveSpomoveBriefingReadiness({
  preset,
  contentOverride,
}: {
  preset: OfficialSpomovePreset;
  contentOverride?: SpomovePresetContentOverride;
}): SpomoveBriefingReadinessResult {
  const state = resolveSpomoveGuideContentState({ preset, contentOverride });
  const guide = state.publishedGuide;
  const draft = state.draftGuide;

  const gaps: SpomoveBriefingEditorialGaps = {
    missingObjective: !hasText(guide?.objective ?? draft?.objective),
    missingTeachingPoints: !(guide?.teachingPoints?.length || draft?.teachingPoints?.length),
    missingInstruction: !hasText(guide?.instruction ?? draft?.instruction),
    missingFocusTags: !(guide?.focusTags?.length || draft?.focusTags?.length),
  };

  if (state.structured === 'publishedValid' && guide) {
    const ready =
      hasText(guide.objective) &&
      Boolean(guide.teachingPoints?.length) &&
      hasText(guide.instruction) &&
      Boolean(guide.focusTags?.length);
    return {
      readiness: ready ? 'ready' : 'needsEditorial',
      gaps: {
        missingObjective: !hasText(guide.objective),
        missingTeachingPoints: !guide.teachingPoints?.length,
        missingInstruction: !hasText(guide.instruction),
        missingFocusTags: !guide.focusTags?.length,
      },
    };
  }

  if (state.legacyManual) {
    return { readiness: 'legacy', gaps };
  }

  return { readiness: 'missing', gaps };
}
