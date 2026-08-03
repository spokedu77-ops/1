import { findOfficialSpomovePreset } from '@/app/spokedu-master/spomove/officialSpomovePresets';
import {
  normalizeSpomoveMovementGuideDraft,
  publishSpomoveMovementGuide,
  validateSpomoveMovementGuideDraft,
  type SpomoveGuideValidationIssue,
} from './spomoveGuideContract';

export type SpomovePublishedGuideSaveIssue = {
  presetId: string;
  field:
    | 'preset'
    | 'movementGuide'
    | 'movement'
    | 'instruction'
    | 'coachScript'
    | 'focusTags'
    | 'easier'
    | 'harder';
  code:
    | 'unknownPreset'
    | 'missingPublishedGuide'
    | 'invalidPublishedGuide'
    | 'publisherRejected';
  path: Array<string | number>;
  message: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function readRawContentObject(raw: unknown): Record<string, unknown> | null {
  if (!isRecord(raw)) return null;
  if (isRecord(raw.content)) return raw.content;
  return raw;
}

function toPublishedGuideIssue(
  presetId: string,
  issue: SpomoveGuideValidationIssue,
): SpomovePublishedGuideSaveIssue {
  return {
    presetId,
    field: issue.field,
    code: 'invalidPublishedGuide',
    path: ['content', presetId, 'movementGuide', issue.field],
    message: issue.message,
  };
}

export function validateSpomovePublishedGuidesForSave(
  raw: unknown,
): SpomovePublishedGuideSaveIssue[] {
  const issues: SpomovePublishedGuideSaveIssue[] = [];
  const content = readRawContentObject(raw);
  if (!content) return issues;

  for (const [presetId, rawEntry] of Object.entries(content)) {
    if (!isRecord(rawEntry)) continue;
    if (rawEntry.movementGuideStatus !== 'published') continue;

    const preset = findOfficialSpomovePreset(presetId);
    if (!preset) {
      issues.push({
        presetId,
        field: 'preset',
        code: 'unknownPreset',
        path: ['content', presetId],
        message: 'Unknown SPOMOVE preset.',
      });
      continue;
    }

    const draft = normalizeSpomoveMovementGuideDraft(rawEntry.movementGuide);
    if (!draft) {
      issues.push({
        presetId,
        field: 'movementGuide',
        code: 'missingPublishedGuide',
        path: ['content', presetId, 'movementGuide'],
        message: 'Published guide is missing.',
      });
      continue;
    }

    const validationIssues = validateSpomoveMovementGuideDraft({
      draft,
      preset,
    });

    for (const issue of validationIssues) {
      issues.push(toPublishedGuideIssue(presetId, issue));
    }

    const publishedGuide = publishSpomoveMovementGuide(draft, preset);
    if (validationIssues.length === 0 && publishedGuide === null) {
      issues.push({
        presetId,
        field: 'movementGuide',
        code: 'publisherRejected',
        path: ['content', presetId, 'movementGuide'],
        message: 'Published guide could not be converted into a public guide.',
      });
    }
  }

  return issues;
}
