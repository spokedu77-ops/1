import type { OfficialSpomovePreset } from '@/app/spokedu-master/spomove/officialSpomovePresets';
import { MOVEMENT_REGISTRY } from '@/app/spokedu-master/spomove/movements/movementRegistry';
import type { MovementPick } from '@/app/spokedu-master/spomove/movements/movementTypes';

export type SpomoveFocusTag =
  | 'simpleReaction'
  | 'choiceReaction'
  | 'responseInhibition'
  | 'attentionShift'
  | 'visualSearch'
  | 'sequenceMemory'
  | 'ruleSwitching'
  | 'movementCoordination'
  | 'lowerBodyCoordination'
  | 'upperLowerCoordination'
  | 'balanceControl'
  | 'landingControl'
  | 'postureControl'
  | 'directionControl'
  | 'individual'
  | 'simultaneous'
  | 'turnTaking'
  | 'cooperative'
  | 'competitive';

export type SpomoveMovementGuideStatus = 'draft' | 'published';

export type SpomoveMovementGuideVariations = {
  movement?: string;
  rule?: string;
  operation?: string;
};

export type SpomoveMovementGuideDraft = {
  /**
   * undefined: not decided yet
   * null: the screen itself gives the movement cue
   * MovementPick: an official recommended movement
   */
  movement?: MovementPick | null;
  instruction?: string;
  coachScript?: string;
  focusTags?: readonly SpomoveFocusTag[];
  easier?: string;
  harder?: string;
  successCriteria?: string;
  commonMistake?: string;
  variations?: SpomoveMovementGuideVariations;
};

export type SpomoveMovementGuide = {
  movement: MovementPick | null;
  instruction: string;
  coachScript: string;
  focusTags: readonly SpomoveFocusTag[];
  easier: string;
  harder: string;
  successCriteria?: string;
  commonMistake?: string;
  variations?: SpomoveMovementGuideVariations;
};

export type SpomoveGuideValidationIssue = {
  field: 'movement' | 'instruction' | 'coachScript' | 'focusTags' | 'easier' | 'harder';
  message: string;
};

export const SPOMOVE_FOCUS_TAGS: readonly SpomoveFocusTag[] = [
  'simpleReaction',
  'choiceReaction',
  'responseInhibition',
  'attentionShift',
  'visualSearch',
  'sequenceMemory',
  'ruleSwitching',
  'movementCoordination',
  'lowerBodyCoordination',
  'upperLowerCoordination',
  'balanceControl',
  'landingControl',
  'postureControl',
  'directionControl',
  'individual',
  'simultaneous',
  'turnTaking',
  'cooperative',
  'competitive',
];

const SPOMOVE_FOCUS_TAG_SET = new Set<string>(SPOMOVE_FOCUS_TAGS);

function normalizeString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

function normalizeMovementPick(value: unknown): MovementPick | null | undefined {
  if (value === null) return null;
  if (!value || typeof value !== 'object') return undefined;

  const pick = value as Record<string, unknown>;
  const baseMovement = normalizeString(pick.baseMovement);
  const limbRule = normalizeString(pick.limbRule);
  if (!baseMovement || !limbRule) return undefined;

  const movement = MOVEMENT_REGISTRY[baseMovement as keyof typeof MOVEMENT_REGISTRY];
  if (!movement) return undefined;
  if (!movement.supportedLimbRules.includes(limbRule as MovementPick['limbRule'])) return undefined;

  return {
    baseMovement: movement.id,
    limbRule: limbRule as MovementPick['limbRule'],
  };
}

function normalizeFocusTags(value: unknown): SpomoveFocusTag[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const next: SpomoveFocusTag[] = [];
  for (const tag of value) {
    if (typeof tag !== 'string' || !SPOMOVE_FOCUS_TAG_SET.has(tag)) continue;
    if (next.includes(tag as SpomoveFocusTag)) continue;
    next.push(tag as SpomoveFocusTag);
    if (next.length >= 3) break;
  }
  return next.length > 0 ? next : undefined;
}

function normalizeVariations(value: unknown): SpomoveMovementGuideVariations | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const source = value as Record<string, unknown>;
  const variations = {
    movement: normalizeString(source.movement),
    rule: normalizeString(source.rule),
    operation: normalizeString(source.operation),
  };
  return Object.values(variations).some(Boolean) ? variations : undefined;
}

export function normalizeSpomoveMovementGuideDraft(value: unknown): SpomoveMovementGuideDraft | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const source = value as Record<string, unknown>;
  const draft: SpomoveMovementGuideDraft = {};

  const movement = normalizeMovementPick(source.movement);
  if (movement !== undefined) draft.movement = movement;

  const instruction = normalizeString(source.instruction);
  if (instruction) draft.instruction = instruction;

  const coachScript = normalizeString(source.coachScript) ?? normalizeString(source.teacherCue);
  if (coachScript) draft.coachScript = coachScript;

  const focusTags = normalizeFocusTags(source.focusTags);
  if (focusTags) draft.focusTags = focusTags;

  const easier = normalizeString(source.easier);
  if (easier) draft.easier = easier;

  const harder = normalizeString(source.harder);
  if (harder) draft.harder = harder;

  const successCriteria = normalizeString(source.successCriteria);
  if (successCriteria) draft.successCriteria = successCriteria;

  const commonMistake = normalizeString(source.commonMistake);
  if (commonMistake) draft.commonMistake = commonMistake;

  const variations = normalizeVariations(source.variations) ?? normalizeVariations(source.remix);
  if (variations) draft.variations = variations;

  return Object.keys(draft).length > 0 ? draft : undefined;
}

function isBuiltInMovementPreset(preset: OfficialSpomovePreset): boolean {
  return preset.movementProfileId === 'bodyCueBuiltIn' || preset.movementProfileId === 'diveBuiltIn';
}

export function validateSpomoveMovementGuideDraft(
  draft: SpomoveMovementGuideDraft | undefined,
  preset?: OfficialSpomovePreset,
): SpomoveGuideValidationIssue[] {
  const issues: SpomoveGuideValidationIssue[] = [];

  if (!draft || draft.movement === undefined) {
    issues.push({ field: 'movement', message: 'Choose a recommended movement.' });
  } else if (draft.movement === null && preset && !isBuiltInMovementPreset(preset)) {
    issues.push({ field: 'movement', message: 'Built-in movement is only valid for built-in cue presets.' });
  }

  if (!draft?.instruction) issues.push({ field: 'instruction', message: 'Enter the class instruction.' });
  if (!draft?.coachScript) issues.push({ field: 'coachScript', message: 'Enter the coach script.' });
  if (!draft?.focusTags?.length) issues.push({ field: 'focusTags', message: 'Choose at least one focus tag.' });
  if (!draft?.easier) issues.push({ field: 'easier', message: 'Enter an easier variation.' });
  if (!draft?.harder) issues.push({ field: 'harder', message: 'Enter a harder variation.' });

  return issues;
}

export function publishSpomoveMovementGuide(
  draft: SpomoveMovementGuideDraft | undefined,
  preset: OfficialSpomovePreset,
): SpomoveMovementGuide | null {
  const normalized = normalizeSpomoveMovementGuideDraft(draft);
  if (validateSpomoveMovementGuideDraft(normalized, preset).length > 0 || !normalized) return null;
  if (normalized.movement === undefined) return null;
  if (
    !normalized.instruction ||
    !normalized.coachScript ||
    !normalized.focusTags?.length ||
    !normalized.easier ||
    !normalized.harder
  ) {
    return null;
  }

  return {
    movement: normalized.movement,
    instruction: normalized.instruction,
    coachScript: normalized.coachScript,
    focusTags: normalized.focusTags,
    easier: normalized.easier,
    harder: normalized.harder,
    successCriteria: normalized.successCriteria,
    commonMistake: normalized.commonMistake,
    variations: normalized.variations,
  };
}
