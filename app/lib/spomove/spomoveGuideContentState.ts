import type { OfficialSpomovePreset } from '@/app/spokedu-master/spomove/officialSpomovePresets';
import type { SpomovePresetContentOverride } from './spomoveOfficialAssets';
import {
  publishSpomoveMovementGuide,
  validateSpomoveMovementGuideDraft,
  type SpomoveGuideValidationIssue,
  type SpomoveMovementGuide,
  type SpomoveMovementGuideDraft,
} from './spomoveGuideContract';

export type SpomoveStructuredGuideState =
  | 'none'
  | 'draft'
  | 'publishedValid'
  | 'publishedInvalid';

export type SpomoveGuideLegacyManual = {
  activityMethod: string | null;
  activityConcept: string | null;
};

export type SpomoveGuideContentState = {
  structured: SpomoveStructuredGuideState;
  draftGuide: SpomoveMovementGuideDraft | null;
  publishedGuide: SpomoveMovementGuide | null;
  validationIssues: SpomoveGuideValidationIssue[];
  legacyManual: SpomoveGuideLegacyManual | null;
};

function cleanText(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function resolveSpomoveGuideContentState({
  preset,
  contentOverride,
}: {
  preset: OfficialSpomovePreset;
  contentOverride?: SpomovePresetContentOverride;
}): SpomoveGuideContentState {
  const draftGuide = contentOverride?.movementGuide ?? null;
  const legacyActivityMethod = cleanText(contentOverride?.activityMethod);
  const legacyActivityConcept = cleanText(contentOverride?.activityConcept);
  const legacyManual =
    legacyActivityMethod || legacyActivityConcept
      ? {
          activityMethod: legacyActivityMethod,
          activityConcept: legacyActivityConcept,
        }
      : null;

  if (!draftGuide) {
    return {
      structured: 'none',
      draftGuide: null,
      publishedGuide: null,
      validationIssues: [],
      legacyManual,
    };
  }

  const validationIssues = validateSpomoveMovementGuideDraft({ draft: draftGuide, preset });
  if (contentOverride?.movementGuideStatus !== 'published') {
    return {
      structured: 'draft',
      draftGuide,
      publishedGuide: null,
      validationIssues,
      legacyManual,
    };
  }

  const publishedGuide = publishSpomoveMovementGuide(draftGuide, preset);
  return {
    structured: publishedGuide ? 'publishedValid' : 'publishedInvalid',
    draftGuide,
    publishedGuide,
    validationIssues,
    legacyManual,
  };
}
