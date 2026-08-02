import { describe, expect, it } from 'vitest';

import { findOfficialSpomovePreset } from '@/app/spokedu-master/spomove/officialSpomovePresets';
import { resolveSpomoveGuideContentState } from './spomoveGuideContentState';

describe('spomoveGuideContentState', () => {
  const preset = findOfficialSpomovePreset('reaction-cognition-space-direction-01')!;

  it('treats missing status with a guide as draft', () => {
    const state = resolveSpomoveGuideContentState({
      preset,
      contentOverride: {
        movementGuide: {
          instruction: 'Partial draft.',
        },
      },
    });

    expect(state.structured).toBe('draft');
    expect(state.publishedGuide).toBeNull();
    expect(state.draftGuide?.instruction).toBe('Partial draft.');
  });

  it('returns publishedValid only when published status passes the publisher', () => {
    const state = resolveSpomoveGuideContentState({
      preset,
      contentOverride: {
        movementGuideStatus: 'published',
        movementGuide: {
          movement: { baseMovement: 'footTap', limbRule: 'free' },
          instruction: 'Move to the matching color.',
          coachScript: 'Look first, then move.',
          focusTags: ['choiceReaction'],
          easier: 'Use a slower cue.',
          harder: 'Add a callout before moving.',
        },
      },
    });

    expect(state.structured).toBe('publishedValid');
    expect(state.publishedGuide?.instruction).toBe('Move to the matching color.');
    expect(state.validationIssues).toEqual([]);
  });

  it('separates invalid published guides from legacy manual content', () => {
    const state = resolveSpomoveGuideContentState({
      preset,
      contentOverride: {
        activityMethod: 'Legacy method',
        activityConcept: 'Legacy concept',
        movementGuideStatus: 'published',
        movementGuide: {
          instruction: 'Missing required publish fields.',
        },
      },
    });

    expect(state.structured).toBe('publishedInvalid');
    expect(state.publishedGuide).toBeNull();
    expect(state.validationIssues.length).toBeGreaterThan(0);
    expect(state.legacyManual).toEqual({
      activityMethod: 'Legacy method',
      activityConcept: 'Legacy concept',
    });
  });
});
