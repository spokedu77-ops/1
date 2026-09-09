import { describe, expect, it } from 'vitest';

import {
  hasOnlyAllowedSpomoveGuideVideoRefs,
  hasOnlyPrivateSpomoveGuideVideoRefs,
  isAllowedSpomoveGuideVideoRef,
  isPrivateSpomoveGuideVideoRef,
  normalizeSpomoveContentMap,
} from './spomoveOfficialAssets';

describe('spomoveOfficialAssets', () => {
  it('accepts private Premium media paths and YouTube/Vimeo URLs for guide videos', () => {
    expect(isPrivateSpomoveGuideVideoRef('guides/activity.mp4')).toBe(true);
    expect(isPrivateSpomoveGuideVideoRef('spokedu-master-premium-media/guides/activity.webm')).toBe(true);
    expect(isPrivateSpomoveGuideVideoRef('https://youtu.be/dQw4w9WgXcQ')).toBe(false);
    expect(isAllowedSpomoveGuideVideoRef('guides/activity.mp4')).toBe(true);
    expect(isAllowedSpomoveGuideVideoRef('https://youtu.be/dQw4w9WgXcQ')).toBe(true);
    expect(isAllowedSpomoveGuideVideoRef('https://example.com/video.mp4')).toBe(false);
    expect(hasOnlyPrivateSpomoveGuideVideoRefs({
      guideVideos: { 'reaction-cognition-space-direction-01': 'guides/activity.mp4' },
    })).toBe(true);
    expect(hasOnlyPrivateSpomoveGuideVideoRefs({
      guideVideos: { 'reaction-cognition-space-direction-01': 'https://youtu.be/dQw4w9WgXcQ' },
    })).toBe(false);
    expect(hasOnlyAllowedSpomoveGuideVideoRefs({
      guideVideos: { 'reaction-cognition-space-direction-01': 'https://youtu.be/dQw4w9WgXcQ' },
    })).toBe(true);
  });

  it('preserves partial movement guide drafts and v1 legacy fields', () => {
    const map = normalizeSpomoveContentMap({
      schemaVersion: 2,
      content: {
        'reaction-cognition-space-direction-01': {
          coreKeywords: ['behindMat', 'individual', 'easy'],
          activityMethod: ' Legacy method ',
          activityConcept: ' Legacy concept ',
          movementGuideStatus: 'draft',
          movementGuide: {
            movement: { baseMovement: 'twoLegJump', limbRule: 'free' },
            objective: ' React accurately. ',
            teachingPoints: [' Accuracy first. ', '', 'Use a color cue.', 'Keep only three.', 'Dropped fourth.'],
            instruction: ' Move to the matching color. ',
          },
        },
      },
    });

    expect(map['reaction-cognition-space-direction-01']?.coreKeywords).toHaveLength(3);
    expect(map['reaction-cognition-space-direction-01']).toMatchObject({
      activityMethod: 'Legacy method',
      activityConcept: 'Legacy concept',
      movementGuideStatus: 'draft',
      movementGuide: {
        movement: { baseMovement: 'twoLegJump', limbRule: 'free' },
        objective: 'React accurately.',
        teachingPoints: ['Accuracy first.', 'Use a color cue.', 'Keep only three.'],
        instruction: 'Move to the matching color.',
      },
    });
  });

  it('normalizes legacy teacherCue/remix aliases into stored v2 field names', () => {
    const map = normalizeSpomoveContentMap({
      content: {
        'reaction-cognition-space-direction-01': {
          movementGuideStatus: 'published',
          movementGuide: {
            movement: null,
            teacherCue: ' Watch first. ',
            remix: { movement: 'Use hand touch.' },
          },
        },
      },
    });

    expect(map['reaction-cognition-space-direction-01']?.movementGuide).toEqual({
      movement: null,
      coachScript: 'Watch first.',
      variations: { movement: 'Use hand touch.' },
    });
    expect(map['reaction-cognition-space-direction-01']?.movementGuideStatus).toBe('published');
  });

  it('drops invalid preset ids, invalid statuses, and invalid movement picks without dropping valid draft text', () => {
    const map = normalizeSpomoveContentMap({
      schemaVersion: 2,
      content: {
        missing: {
          activityMethod: 'No preset.',
        },
        'reaction-cognition-space-direction-01': {
          movementGuideStatus: 'live',
          movementGuide: {
            movement: { baseMovement: 'twoLegJump', limbRule: 'sameSide' },
            instruction: 'Keep this draft field.',
          },
        },
      },
    });

    expect(map.missing).toBeUndefined();
    expect(map['reaction-cognition-space-direction-01']).toEqual({
      movementGuide: {
        instruction: 'Keep this draft field.',
      },
    });
  });

  it('drops movement guide status when no guide draft remains', () => {
    const map = normalizeSpomoveContentMap({
      schemaVersion: 2,
      content: {
        'reaction-cognition-space-direction-01': {
          movementGuideStatus: 'published',
        },
      },
    });

    expect(map['reaction-cognition-space-direction-01']).toBeUndefined();
  });

  it('keeps only whole-second cue recommendations supported by runtime settings', () => {
    const valid = normalizeSpomoveContentMap({
      content: {
        'reaction-cognition-space-direction-01': { recommendedCueSeconds: 4 },
      },
    });
    const invalid = normalizeSpomoveContentMap({
      content: {
        'reaction-cognition-space-direction-01': { recommendedCueSeconds: 6.5 },
      },
    });

    expect(valid['reaction-cognition-space-direction-01']?.recommendedCueSeconds).toBe(4);
    expect(invalid['reaction-cognition-space-direction-01']).toBeUndefined();
  });
});
