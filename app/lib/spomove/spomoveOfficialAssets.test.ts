import { describe, expect, it } from 'vitest';

import { normalizeSpomoveContentMap } from './spomoveOfficialAssets';

describe('spomoveOfficialAssets', () => {
  it('preserves partial movement guide drafts and v1 legacy fields', () => {
    const map = normalizeSpomoveContentMap({
      schemaVersion: 2,
      content: {
        'reaction-cognition-space-direction-01': {
          title: ' Custom title ',
          coreKeywords: ['behindMat', 'individual', 'easy'],
          activityMethod: ' Legacy method ',
          activityConcept: ' Legacy concept ',
          movementGuideStatus: 'draft',
          movementGuide: {
            movement: { baseMovement: 'twoLegJump', limbRule: 'free' },
            instruction: ' Move to the matching color. ',
          },
        },
      },
    });

    expect(map['reaction-cognition-space-direction-01']?.coreKeywords).toHaveLength(3);
    expect(map['reaction-cognition-space-direction-01']).toMatchObject({
      title: 'Custom title',
      activityMethod: 'Legacy method',
      activityConcept: 'Legacy concept',
      movementGuideStatus: 'draft',
      movementGuide: {
        movement: { baseMovement: 'twoLegJump', limbRule: 'free' },
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
});
