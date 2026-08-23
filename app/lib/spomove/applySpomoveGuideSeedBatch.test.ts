import { describe, expect, it } from 'vitest';

import { applySpomoveGuideSeedBatch, listReactionCognitionSeedsByCluster } from './applySpomoveGuideSeedBatch';
import {
  SPOMOVE_REACTION_COGNITION_GUIDE_SEEDS,
  SPOMOVE_REACTION_COGNITION_SEED_PRESET_IDS,
  mergeSpomoveGuideSeedOverride,
} from './spomoveReactionCognitionGuides';
import { publishSpomoveMovementGuide } from './spomoveGuideContract';
import { resolveSpomoveBriefingReadiness } from './spomoveBriefingReadiness';
import { findOfficialSpomovePreset, OFFICIAL_SPOMOVE_LIBRARY } from '@/app/spokedu-master/spomove/officialSpomovePresets';
import { isHubListedPreset } from '@/app/spokedu-master/spomove/movements/isHubVisiblePreset';
import { FULL_THEME_SEEDS } from '@/app/spokedu-master/spomove/operations/fullThemeSeed';
import { SPOMOVE_EDITORIAL_PILOT_PRESET_IDS } from './spomoveEditorialPilotContent';

const BANNED_GENERIC = [
  '화면을 보고 알맞게 움직입니다.',
  '자극 시간을 늘려 쉽게 진행합니다.',
  '자극 시간을 줄여 어렵게 진행합니다.',
  '아이 수준에 맞게 진행합니다.',
  '정확하게 수행하도록 지도합니다.',
];

describe('spomoveReactionCognitionGuides', () => {
  it('covers exactly the 22 non-pilot active reaction-cognition presets', () => {
    const activeRc = OFFICIAL_SPOMOVE_LIBRARY.filter(isHubListedPreset).filter(
      (p) => p.programGroup === 'reaction-cognition',
    );
    expect(activeRc).toHaveLength(23);

    const pilot = 'reaction-cognition-space-direction-01';
    const expectedNew = activeRc.map((p) => p.id).filter((id) => id !== pilot).sort();
    expect([...SPOMOVE_REACTION_COGNITION_SEED_PRESET_IDS].sort()).toEqual(expectedNew);

    expect(listReactionCognitionSeedsByCluster('L1-space')).toHaveLength(1);
    expect(listReactionCognitionSeedsByCluster('L2-quad')).toHaveLength(7);
    expect(listReactionCognitionSeedsByCluster('L3-full')).toHaveLength(7);
    expect(listReactionCognitionSeedsByCluster('L4-split')).toHaveLength(7);
  });

  it('publishes and is briefing-ready for every seed against its preset', () => {
    for (const seed of SPOMOVE_REACTION_COGNITION_GUIDE_SEEDS) {
      const preset = findOfficialSpomovePreset(seed.presetId);
      expect(preset, seed.presetId).toBeTruthy();
      expect(isHubListedPreset(preset!)).toBe(true);
      expect(preset!.catalogStatus).not.toBe('hold');

      const published = publishSpomoveMovementGuide(seed.movementGuide, preset!);
      expect(published, `${seed.presetId} publish`).not.toBeNull();

      const readiness = resolveSpomoveBriefingReadiness({
        preset: preset!,
        contentOverride: {
          movementGuide: seed.movementGuide,
          movementGuideStatus: 'published',
        },
      });
      expect(readiness.readiness, seed.presetId).toBe('ready');

      const blob = JSON.stringify(seed.movementGuide);
      for (const banned of BANNED_GENERIC) {
        expect(blob.includes(banned), `${seed.presetId} banned: ${banned}`).toBe(false);
      }
    }
  });

  it('uses O2 full-theme recommended movements for L3', () => {
    for (const seed of listReactionCognitionSeedsByCluster('L3-full')) {
      const theme = seed.theme as keyof typeof FULL_THEME_SEEDS;
      expect(seed.movementGuide.movement).toEqual(FULL_THEME_SEEDS[theme].recommendedMovement);
    }
  });

  it('merge preserves existing non-blank guide fields', () => {
    const seed = SPOMOVE_REACTION_COGNITION_GUIDE_SEEDS[0]!;
    const merged = mergeSpomoveGuideSeedOverride(
      {
        displayTitle: 'Keep Title',
        movementGuide: { objective: 'Existing objective stays' },
        movementGuideStatus: 'draft',
      },
      seed,
    );
    expect(merged.displayTitle).toBe('Keep Title');
    expect(merged.movementGuide?.objective).toBe('Existing objective stays');
    expect(merged.movementGuide?.instruction).toBe(seed.movementGuide.instruction);
  });

  it('batch apply only changes allowed seed ids and leaves other pilots untouched', () => {
    const otherPilotId = 'visual-reaction-flash-33';
    const otherPilotGuide = {
      movementGuide: {
        objective: 'other pilot objective',
        instruction: 'other',
        coachScript: 'other',
        focusTags: ['simpleReaction' as const],
        easier: 'e',
        harder: 'h',
        movement: { baseMovement: 'handTouch' as const, limbRule: 'free' as const },
      },
      movementGuideStatus: 'published' as const,
    };
    const current = {
      [otherPilotId]: otherPilotGuide,
      [SPOMOVE_EDITORIAL_PILOT_PRESET_IDS[0]]: {
        movementGuideStatus: 'published' as const,
        movementGuide: { objective: 'pilot keep' },
      },
    };

    const batch = listReactionCognitionSeedsByCluster('L1-space');
    const result = applySpomoveGuideSeedBatch({
      current,
      seeds: batch,
      status: 'draft',
      allowedPresetIds: batch.map((s) => s.presetId),
    });

    expect(result.changedPresetIds).toEqual(['reaction-cognition-space-direction-color-01b']);
    expect(result.content[otherPilotId]).toEqual(otherPilotGuide);
    expect(result.content[SPOMOVE_EDITORIAL_PILOT_PRESET_IDS[0]]?.movementGuide?.objective).toBe(
      'pilot keep',
    );
  });
});
