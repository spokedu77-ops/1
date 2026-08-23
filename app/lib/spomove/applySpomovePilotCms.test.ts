import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { applySpomovePilotCmsMerge, assertOnlyPilotPresetsChanged } from './applySpomovePilotCms';
import { SPOMOVE_EDITORIAL_PILOT_PRESET_IDS } from './spomoveEditorialPilotContent';
import { findOfficialSpomovePreset, OFFICIAL_SPOMOVE_LIBRARY } from '@/app/spokedu-master/spomove/officialSpomovePresets';
import { isHubListedPreset } from '@/app/spokedu-master/spomove/movements/isHubVisiblePreset';
import { publishSpomoveMovementGuide } from './spomoveGuideContract';
import { resolveSpomoveBriefingReadiness } from './spomoveBriefingReadiness';

function walkTsFiles(dir: string, acc: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === '.next') continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walkTsFiles(full, acc);
    else if (/\.(ts|tsx)$/.test(name)) acc.push(full);
  }
  return acc;
}

describe('SPOMOVE Pilot CMS apply contract', () => {
  it('keeps all seven pilot presets active in catalog', () => {
    for (const id of SPOMOVE_EDITORIAL_PILOT_PRESET_IDS) {
      const preset = findOfficialSpomovePreset(id);
      expect(preset).toBeTruthy();
      expect(isHubListedPreset(preset!)).toBe(true);
      expect(preset!.catalogStatus === 'hold').toBe(false);
    }
  });

  it('merges pilot fields without deleting non-empty CMS fields on existing entries', () => {
    const existingId = SPOMOVE_EDITORIAL_PILOT_PRESET_IDS[0]!;
    const before = {
      [existingId]: {
        displayTitle: 'Keep CMS Title',
        shortDescription: 'Keep short description',
        variantLabel: 'Keep variant',
        catalogTags: ['keep-tag'],
        isVisible: true,
        sortOrder: 42,
        coreKeywords: ['start-center', 'solo', 'easy'],
        activityMethod: 'Keep method',
        activityConcept: 'Keep concept',
        movementGuideStatus: 'published' as const,
        movementGuide: {
          movement: { baseMovement: 'twoLegJump' as const, limbRule: 'free' as const },
          objective: 'Keep existing objective.',
          instruction: 'Keep existing instruction.',
          coachScript: 'Keep existing coach script.',
          focusTags: ['choiceReaction' as const],
          easier: 'Keep easier.',
          harder: 'Keep harder.',
          successCriteria: 'Keep success.',
          commonMistake: 'Keep mistake.',
        },
      },
      'unrelated-preset-should-stay': {
        displayTitle: 'Unrelated',
        activityMethod: 'Do not touch',
      },
    };

    const applied = applySpomovePilotCmsMerge({ current: before, status: 'published' });
    expect(applied.changedPresetIds).toEqual([...SPOMOVE_EDITORIAL_PILOT_PRESET_IDS]);
    expect(assertOnlyPilotPresetsChanged(before, applied.content)).toEqual([
      ...SPOMOVE_EDITORIAL_PILOT_PRESET_IDS,
    ]);

    const merged = applied.content[existingId]!;
    expect(merged.displayTitle).toBe('Keep CMS Title');
    expect(merged.shortDescription).toBe('Keep short description');
    expect(merged.variantLabel).toBe('Keep variant');
    expect(merged.catalogTags).toEqual(['keep-tag']);
    expect(merged.isVisible).toBe(true);
    expect(merged.sortOrder).toBe(42);
    expect(merged.activityMethod).toBe('Keep method');
    expect(merged.activityConcept).toBe('Keep concept');
    expect(merged.movementGuide?.objective).toBe('Keep existing objective.');
    expect(merged.movementGuide?.instruction).toBe('Keep existing instruction.');
    expect(merged.movementGuide?.coachScript).toBe('Keep existing coach script.');
    expect(merged.movementGuide?.easier).toBe('Keep easier.');
    expect(merged.movementGuide?.harder).toBe('Keep harder.');
    expect(merged.movementGuide?.successCriteria).toBe('Keep success.');
    expect(merged.movementGuide?.commonMistake).toBe('Keep mistake.');
    expect(merged.movementGuide?.teachingPoints?.length).toBeGreaterThan(0);
    expect(applied.content['unrelated-preset-should-stay']?.displayTitle).toBe('Unrelated');
  });

  it('makes empty CMS pilots publishable and briefing ready when status is published', () => {
    const applied = applySpomovePilotCmsMerge({ current: {}, status: 'published' });
    for (const id of SPOMOVE_EDITORIAL_PILOT_PRESET_IDS) {
      const preset = findOfficialSpomovePreset(id)!;
      const override = applied.content[id]!;
      expect(publishSpomoveMovementGuide(override.movementGuide, preset)).not.toBeNull();
      expect(resolveSpomoveBriefingReadiness({ preset, contentOverride: override }).readiness).toBe(
        'ready',
      );
    }
  });

  it('does not import Pilot module from Public SPOMOVE runtime sources', () => {
    const roots = [
      join(process.cwd(), 'app/spokedu-master/spomove'),
      join(process.cwd(), 'app/spokedu-master/dashboard'),
    ];
    const forbidden = [
      'spomoveEditorialPilotContent',
      'applySpomovePilotCms',
      'SPOMOVE_EDITORIAL_PILOT',
    ];
    for (const root of roots) {
      for (const file of walkTsFiles(root)) {
        if (file.includes('.test.') || file.includes('.contract.test.')) continue;
        const source = readFileSync(file, 'utf8');
        for (const token of forbidden) {
          expect(source.includes(token), `${file} imports ${token}`).toBe(false);
        }
      }
    }
  });

  it('keeps active catalog denominator derived from SSOT', () => {
    expect(OFFICIAL_SPOMOVE_LIBRARY.filter(isHubListedPreset)).toHaveLength(72);
  });
});
