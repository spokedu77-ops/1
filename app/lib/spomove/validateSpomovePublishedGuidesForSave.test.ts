import { describe, expect, it } from 'vitest';

import { validateSpomovePublishedGuidesForSave } from './validateSpomovePublishedGuidesForSave';

const validMovementGuide = {
  movement: { baseMovement: 'footTap', limbRule: 'free' },
  instruction: 'Move to the matching color.',
  coachScript: 'Look first, then move.',
  focusTags: ['choiceReaction'],
  easier: 'Use a slower cue.',
  harder: 'Add a callout before moving.',
};

describe('validateSpomovePublishedGuidesForSave', () => {
  it('allows draft, partial guide, and legacy manual data while authors are still working', () => {
    expect(
      validateSpomovePublishedGuidesForSave({
        schemaVersion: 2,
        content: {
          draftPreset: {
            movementGuideStatus: 'draft',
            movementGuide: { instruction: 'Work in progress.' },
          },
          statuslessGuide: {
            movementGuide: { instruction: 'Work in progress.' },
          },
          legacyOnly: {
            activityMethod: 'Legacy method',
            activityConcept: 'Legacy concept',
          },
        },
      }),
    ).toEqual([]);
  });

  it('allows a complete published guide', () => {
    expect(
      validateSpomovePublishedGuidesForSave({
        schemaVersion: 2,
        content: {
          'reaction-cognition-space-direction-01': {
            movementGuideStatus: 'published',
            movementGuide: validMovementGuide,
          },
        },
      }),
    ).toEqual([]);
  });

  it('rejects published status without a guide', () => {
    expect(
      validateSpomovePublishedGuidesForSave({
        schemaVersion: 2,
        content: {
          'reaction-cognition-space-direction-01': {
            movementGuideStatus: 'published',
          },
        },
      }),
    ).toMatchObject([
      {
        presetId: 'reaction-cognition-space-direction-01',
        field: 'movementGuide',
        code: 'missingPublishedGuide',
        path: ['content', 'reaction-cognition-space-direction-01', 'movementGuide'],
      },
    ]);
  });

  it('rejects incomplete published guides even when legacy manual fallback exists', () => {
    const issues = validateSpomovePublishedGuidesForSave({
      schemaVersion: 2,
      content: {
        'reaction-cognition-space-direction-01': {
          activityMethod: 'Legacy method',
          activityConcept: 'Legacy concept',
          movementGuideStatus: 'published',
          movementGuide: {
            instruction: 'Only the instruction is written.',
          },
        },
      },
    });

    expect(issues.map((issue) => issue.field)).toEqual([
      'movement',
      'coachScript',
      'focusTags',
      'easier',
      'harder',
    ]);
    expect(issues.every((issue) => issue.code === 'invalidPublishedGuide')).toBe(true);
  });

  it('rejects null movement for regular presets and allows it for built-in cue presets', () => {
    const builtInGuide = {
      ...validMovementGuide,
      movement: null,
    };

    expect(
      validateSpomovePublishedGuidesForSave({
        content: {
          'reaction-cognition-space-direction-01': {
            movementGuideStatus: 'published',
            movementGuide: builtInGuide,
          },
          'dive-standard': {
            movementGuideStatus: 'published',
            movementGuide: builtInGuide,
          },
        },
      }),
    ).toMatchObject([
      {
        presetId: 'reaction-cognition-space-direction-01',
        field: 'movement',
        code: 'invalidPublishedGuide',
      },
    ]);
  });

  it('rejects unknown presets marked as published', () => {
    expect(
      validateSpomovePublishedGuidesForSave({
        content: {
          'unknown-preset': {
            movementGuideStatus: 'published',
            movementGuide: validMovementGuide,
          },
        },
      }),
    ).toMatchObject([
      {
        presetId: 'unknown-preset',
        field: 'preset',
        code: 'unknownPreset',
        path: ['content', 'unknown-preset'],
      },
    ]);
  });

  it('does not mutate raw asset json while validating', () => {
    const input = {
      schemaVersion: 2,
      content: {
        'reaction-cognition-space-direction-01': {
          movementGuideStatus: 'published',
          movementGuide: {
            movement: { baseMovement: 'footTap', limbRule: 'free' },
            instruction: '  Move to the matching color.  ',
            coachScript: 'Look first, then move.',
            focusTags: ['choiceReaction', 'choiceReaction'],
            easier: 'Use a slower cue.',
            harder: 'Add a callout before moving.',
          },
        },
      },
    };
    const before = structuredClone(input);

    validateSpomovePublishedGuidesForSave(input);

    expect(input).toEqual(before);
  });
});
