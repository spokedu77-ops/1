import { describe, expect, it } from 'vitest';

import { findOfficialSpomovePreset } from '@/app/spokedu-master/spomove/officialSpomovePresets';
import { isHubListedPreset } from '@/app/spokedu-master/spomove/movements/isHubVisiblePreset';
import { OFFICIAL_SPOMOVE_LIBRARY } from '@/app/spokedu-master/spomove/officialSpomovePresets';
import { publishSpomoveMovementGuide, validateSpomoveMovementGuideDraft } from './spomoveGuideContract';
import { resolveSpomoveBriefingReadiness } from './spomoveBriefingReadiness';
import { buildSpomoveBriefingCoverage, listActiveSpomoveCatalog } from './spomoveBriefingCoverage';
import {
  SPOMOVE_EDITORIAL_PILOT_CONTENT,
  SPOMOVE_EDITORIAL_PILOT_PRESET_IDS,
  buildSpomoveEditorialPilotContentMap,
  mergeSpomoveEditorialPilotOverride,
} from './spomoveEditorialPilotContent';

const publishedBase = {
  movement: { baseMovement: 'footTap' as const, limbRule: 'free' as const },
  instruction: 'Move to the matching pad.',
  coachScript: 'Look first, then move.',
  focusTags: ['choiceReaction' as const],
  easier: 'Slow the cue.',
  harder: 'Shorten the cue.',
};

describe('resolveSpomoveBriefingReadiness', () => {
  const preset = findOfficialSpomovePreset('reaction-cognition-space-direction-01')!;

  it('marks publishedValid + objective + teachingPoints as ready', () => {
    const result = resolveSpomoveBriefingReadiness({
      preset,
      contentOverride: {
        movementGuideStatus: 'published',
        movementGuide: {
          ...publishedBase,
          objective: 'Recognize the direction and move accurately.',
          teachingPoints: ['Check accuracy before speed.'],
        },
      },
    });
    expect(result.readiness).toBe('ready');
  });

  it('marks publishedValid without objective as needsEditorial', () => {
    const result = resolveSpomoveBriefingReadiness({
      preset,
      contentOverride: {
        movementGuideStatus: 'published',
        movementGuide: {
          ...publishedBase,
          teachingPoints: ['Check accuracy before speed.'],
        },
      },
    });
    expect(result.readiness).toBe('needsEditorial');
    expect(result.gaps.missingObjective).toBe(true);
  });

  it('marks publishedValid without teachingPoints as needsEditorial', () => {
    const result = resolveSpomoveBriefingReadiness({
      preset,
      contentOverride: {
        movementGuideStatus: 'published',
        movementGuide: {
          ...publishedBase,
          objective: 'Recognize the direction and move accurately.',
        },
      },
    });
    expect(result.readiness).toBe('needsEditorial');
    expect(result.gaps.missingTeachingPoints).toBe(true);
  });

  it('marks legacy manual content as legacy', () => {
    const result = resolveSpomoveBriefingReadiness({
      preset,
      contentOverride: {
        activityMethod: 'Step to the color.',
        activityConcept: 'Simple direction response.',
      },
    });
    expect(result.readiness).toBe('legacy');
  });

  it('marks empty content as missing', () => {
    expect(resolveSpomoveBriefingReadiness({ preset }).readiness).toBe('missing');
  });

  it('keeps published guide validation valid without objective/teachingPoints', () => {
    const draft = { ...publishedBase };
    expect(validateSpomoveMovementGuideDraft({ draft, preset })).toEqual([]);
    expect(publishSpomoveMovementGuide(draft, preset)).not.toBeNull();
  });
});

describe('active catalog briefing coverage', () => {
  it('derives active catalog count from SSOT without hardcoding in runtime helper', () => {
    const active = listActiveSpomoveCatalog();
    expect(active).toHaveLength(OFFICIAL_SPOMOVE_LIBRARY.filter(isHubListedPreset).length);
    expect(active).toHaveLength(72);
  });

  it('summarizes empty CMS as missing for the active denominator', () => {
    const summary = buildSpomoveBriefingCoverage({});
    expect(summary.activeCount).toBe(72);
    expect(summary.byReadiness.missing).toBe(72);
    expect(summary.byReadiness.ready).toBe(0);
  });
});

describe('editorial pilot content', () => {
  it('covers one distinct preset per program group', () => {
    expect(SPOMOVE_EDITORIAL_PILOT_PRESET_IDS).toHaveLength(7);
    const groups = new Set(SPOMOVE_EDITORIAL_PILOT_CONTENT.map((entry) => entry.programGroup));
    expect(groups.size).toBe(7);
  });

  it('becomes briefing ready when merged and published', () => {
    for (const pilot of SPOMOVE_EDITORIAL_PILOT_CONTENT) {
      const preset = findOfficialSpomovePreset(pilot.presetId)!;
      expect(isHubListedPreset(preset)).toBe(true);
      const override = {
        ...mergeSpomoveEditorialPilotOverride(undefined, pilot),
        movementGuideStatus: 'published' as const,
      };
      expect(publishSpomoveMovementGuide(override.movementGuide, preset)).not.toBeNull();
      expect(resolveSpomoveBriefingReadiness({ preset, contentOverride: override }).readiness).toBe('ready');
    }
  });

  it('preserves existing non-blank guide fields when merging pilots', () => {
    const pilot = SPOMOVE_EDITORIAL_PILOT_CONTENT[0]!;
    const merged = mergeSpomoveEditorialPilotOverride(
      {
        movementGuideStatus: 'published',
        movementGuide: {
          ...publishedBase,
          objective: 'Keep this existing objective.',
          instruction: 'Keep this existing instruction.',
        },
      },
      pilot,
    );
    expect(merged.movementGuide?.objective).toBe('Keep this existing objective.');
    expect(merged.movementGuide?.instruction).toBe('Keep this existing instruction.');
    expect(merged.movementGuide?.teachingPoints?.length).toBeGreaterThan(0);
  });

  it('raises ready count after applying published pilots to empty coverage', () => {
    const map = buildSpomoveEditorialPilotContentMap();
    for (const id of SPOMOVE_EDITORIAL_PILOT_PRESET_IDS) {
      map[id] = { ...map[id]!, movementGuideStatus: 'published' };
    }
    const summary = buildSpomoveBriefingCoverage(map);
    expect(summary.byReadiness.ready).toBe(7);
    expect(summary.byReadiness.missing).toBe(65);
  });
});
