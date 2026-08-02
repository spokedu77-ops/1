import { describe, expect, it } from 'vitest';

import { findOfficialSpomovePreset } from '@/app/spokedu-master/spomove/officialSpomovePresets';
import {
  normalizeSpomoveMovementGuideDraft,
  publishSpomoveMovementGuide,
  validateSpomoveMovementGuideDraft,
} from './spomoveGuideContract';

describe('spomoveGuideContract', () => {
  it('preserves partial draft fields instead of dropping the whole guide', () => {
    expect(
      normalizeSpomoveMovementGuideDraft({
        movement: { baseMovement: 'twoLegJump', limbRule: 'free' },
        instruction: '  Move to the matching color.  ',
        coachScript: '',
      }),
    ).toEqual({
      movement: { baseMovement: 'twoLegJump', limbRule: 'free' },
      instruction: 'Move to the matching color.',
    });
  });

  it('normalizes legacy teacherCue/remix aliases into the v2 field names', () => {
    expect(
      normalizeSpomoveMovementGuideDraft({
        teacherCue: '  Eyes first, then move. ',
        remix: {
          movement: 'Use hand touch instead.',
          rule: 'Call the color before moving.',
          operation: '',
        },
      }),
    ).toEqual({
      coachScript: 'Eyes first, then move.',
      variations: {
        movement: 'Use hand touch instead.',
        rule: 'Call the color before moving.',
      },
    });
  });

  it('deduplicates focus tags, keeps order, and caps them at three', () => {
    expect(
      normalizeSpomoveMovementGuideDraft({
        focusTags: [
          'choiceReaction',
          'choiceReaction',
          'landingControl',
          'not-a-tag',
          'directionControl',
          'individual',
        ],
      }),
    ).toEqual({
      focusTags: ['choiceReaction', 'landingControl', 'directionControl'],
    });
  });

  it('validates movement picks against the movement registry and supported limb rules', () => {
    expect(
      normalizeSpomoveMovementGuideDraft({
        movement: { baseMovement: 'twoLegJump', limbRule: 'sameSide' },
        instruction: 'Kept even when movement is invalid.',
      }),
    ).toEqual({
      instruction: 'Kept even when movement is invalid.',
    });
  });

  it('returns validation issues until all publish-required fields exist', () => {
    const preset = findOfficialSpomovePreset('reaction-cognition-space-direction-01')!;
    const issues = validateSpomoveMovementGuideDraft({
      preset,
      draft: {
        movement: { baseMovement: 'footTap', limbRule: 'free' },
        instruction: 'Move to the matching color.',
      },
    });

    expect(issues.map((issue) => issue.field)).toEqual([
      'coachScript',
      'focusTags',
      'easier',
      'harder',
    ]);
  });

  it('publishes only valid complete drafts', () => {
    const preset = findOfficialSpomovePreset('reaction-cognition-space-direction-01')!;

    expect(
      publishSpomoveMovementGuide(
        {
          movement: { baseMovement: 'footTap', limbRule: 'free' },
          instruction: 'Move to the matching color.',
          coachScript: 'Look first, then move.',
          focusTags: ['choiceReaction'],
          easier: 'Use a slower cue.',
          harder: 'Add a callout before moving.',
        },
        preset,
      ),
    ).toEqual({
      movement: { baseMovement: 'footTap', limbRule: 'free' },
      instruction: 'Move to the matching color.',
      coachScript: 'Look first, then move.',
      focusTags: ['choiceReaction'],
      easier: 'Use a slower cue.',
      harder: 'Add a callout before moving.',
    });

    expect(
      publishSpomoveMovementGuide(
        {
          movement: { baseMovement: 'footTap', limbRule: 'free' },
          instruction: 'Move to the matching color.',
        },
        preset,
      ),
    ).toBeNull();
  });

  it('allows null movement only for built-in movement presets when a preset is supplied', () => {
    const regular = findOfficialSpomovePreset('reaction-cognition-space-direction-01')!;
    const builtIn = findOfficialSpomovePreset('dive-standard')!;
    const draft = {
      movement: null,
      instruction: 'Follow the screen cue.',
      coachScript: 'Watch the screen and move.',
      focusTags: ['simpleReaction'] as const,
      easier: 'Slow the pace.',
      harder: 'Add a second action.',
    };

    expect(publishSpomoveMovementGuide(draft, regular)).toBeNull();
    expect(publishSpomoveMovementGuide(draft, builtIn)?.movement).toBeNull();
  });
});
