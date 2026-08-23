import { describe, expect, it } from 'vitest';

import { applySpomoveGuideSeedBatch } from './applySpomoveGuideSeedBatch';
import { publishSpomoveMovementGuide } from './spomoveGuideContract';
import { resolveSpomoveBriefingReadiness } from './spomoveBriefingReadiness';
import {
  SPOMOVE_VISUAL_REACTION_GUIDE_SEEDS,
  SPOMOVE_VISUAL_REACTION_SEED_PRESET_IDS,
  listVisualReactionSeedsByCluster,
} from './spomoveVisualReactionGuides';
import { findOfficialSpomovePreset, OFFICIAL_SPOMOVE_LIBRARY } from '@/app/spokedu-master/spomove/officialSpomovePresets';
import { isHubListedPreset } from '@/app/spokedu-master/spomove/movements/isHubVisiblePreset';
import { generateSignal } from '@/app/admin/spomove/training/_player/lib/signals';
import { SPOMOVE_EDITORIAL_PILOT_PRESET_IDS } from './spomoveEditorialPilotContent';

/** Minimal color set for generateSignal (same shape as player tests). */
const COLORS_META = {
  red: { id: 'red', name: '빨강', bg: '#ff0000', text: '#fff', symbol: '●' },
  yellow: { id: 'yellow', name: '노랑', bg: '#ffff00', text: '#000', symbol: '★' },
  blue: { id: 'blue', name: '파랑', bg: '#0000ff', text: '#fff', symbol: '■' },
  green: { id: 'green', name: '초록', bg: '#00ff00', text: '#000', symbol: '▲' },
} as const;

const BANNED = [
  '집중해서 봅니다.',
  '정확하게 수행합니다.',
  '아이 수준에 맞게',
  '시지각 능력을 향상',
  '반응속도를 향상',
  '보너스타임 ON',
  '보너스타임을 켜',
];

describe('spomoveVisualReactionGuides', () => {
  it('covers exactly the 10 active visual-reaction presets', () => {
    const active = OFFICIAL_SPOMOVE_LIBRARY.filter(isHubListedPreset).filter(
      (p) => p.programGroup === 'visual-reaction',
    );
    expect(active).toHaveLength(10);
    expect([...SPOMOVE_VISUAL_REACTION_SEED_PRESET_IDS].sort()).toEqual(
      active.map((p) => p.id).sort(),
    );
    expect(listVisualReactionSeedsByCluster('rush-flow-flash')).toHaveLength(3);
    expect(listVisualReactionSeedsByCluster('mole')).toHaveLength(2);
    expect(listVisualReactionSeedsByCluster('hand-foot')).toHaveLength(3);
    expect(listVisualReactionSeedsByCluster('goalkeeper')).toHaveLength(2);
  });

  it('publishes and is briefing-ready for every seed', () => {
    for (const seed of SPOMOVE_VISUAL_REACTION_GUIDE_SEEDS) {
      const preset = findOfficialSpomovePreset(seed.presetId)!;
      expect(publishSpomoveMovementGuide(seed.movementGuide, preset)).not.toBeNull();
      const readiness = resolveSpomoveBriefingReadiness({
        preset,
        contentOverride: {
          movementGuide: seed.movementGuide,
          movementGuideStatus: 'published',
        },
      });
      expect(readiness.readiness, seed.presetId).toBe('ready');
      const blob = JSON.stringify(seed.movementGuide);
      for (const banned of BANNED) {
        expect(blob.includes(banned), `${seed.presetId}: ${banned}`).toBe(false);
      }
    }
  });

  it('keeps hand-foot signal contract: easy=1 foot, normal 1|2, hard 1|2|3', () => {
    const isFoot = (id: string | undefined) =>
      id === 'rightFoot' || id === 'leftFoot' || id === 'bothFeet';
    const isHand = (id: string | undefined) =>
      id === 'rightHand' || id === 'leftHand' || id === 'bothHands';

    for (let i = 0; i < 80; i++) {
      const sig = generateSignal('basic', 7, Object.values(COLORS_META), {
        handFootDifficulty: 'easy',
      });
      const cells = (sig?.content as { cells?: { bodyActionId?: string }[] })?.cells ?? [];
      expect(cells).toHaveLength(1);
      expect(cells.every((c) => isFoot(c.bodyActionId))).toBe(true);
    }

    let n1 = 0;
    let n2 = 0;
    for (let i = 0; i < 120; i++) {
      const sig = generateSignal('basic', 7, Object.values(COLORS_META), {
        handFootDifficulty: 'normal',
      });
      const cells = (sig?.content as { cells?: { bodyActionId?: string }[] })?.cells ?? [];
      expect([1, 2]).toContain(cells.length);
      if (cells.length === 1) n1 += 1;
      if (cells.length === 2) {
        n2 += 1;
        expect(cells.some((c) => isFoot(c.bodyActionId))).toBe(true);
        expect(cells.some((c) => isHand(c.bodyActionId))).toBe(true);
      }
    }
    expect(n1).toBeGreaterThan(20);
    expect(n2).toBeGreaterThan(20);

    let h1 = 0;
    let h2 = 0;
    let h3 = 0;
    for (let i = 0; i < 200; i++) {
      const sig = generateSignal('basic', 7, Object.values(COLORS_META), {
        handFootDifficulty: 'hard',
      });
      const cells = (sig?.content as { cells?: { bodyActionId?: string }[] })?.cells ?? [];
      expect([1, 2, 3]).toContain(cells.length);
      if (cells.length === 1) h1 += 1;
      if (cells.length === 2) h2 += 1;
      if (cells.length === 3) h3 += 1;
    }
    expect(h1).toBeGreaterThan(10);
    expect(h2).toBeGreaterThan(40);
    expect(h3).toBeGreaterThan(20);
  });

  it('batch apply only changes visual-reaction seed ids', () => {
    const otherId = 'simon-pole-arrows-41';
    const other = {
      movementGuideStatus: 'published' as const,
      movementGuide: {
        objective: 'keep other',
        instruction: 'i',
        coachScript: 'c',
        focusTags: ['choiceReaction' as const],
        easier: 'e',
        harder: 'h',
        movement: { baseMovement: 'footTap' as const, limbRule: 'free' as const },
      },
    };
    const batch = listVisualReactionSeedsByCluster('mole');
    const result = applySpomoveGuideSeedBatch({
      current: {
        [otherId]: other,
        [SPOMOVE_EDITORIAL_PILOT_PRESET_IDS[0]]: {
          movementGuideStatus: 'published',
          movementGuide: { objective: 'rc keep' },
        },
      },
      seeds: batch,
      status: 'draft',
      allowedPresetIds: batch.map((s) => s.presetId),
    });
    expect(result.changedPresetIds.sort()).toEqual(batch.map((s) => s.presetId).sort());
    expect(result.content[otherId]).toEqual(other);
  });

  it('flash refine overwrites existing guide fields when flagged', () => {
    const flash = SPOMOVE_VISUAL_REACTION_GUIDE_SEEDS.find(
      (s) => s.presetId === 'visual-reaction-flash-33',
    )!;
    expect(flash.overwriteGuideFields).toBe(true);
    const result = applySpomoveGuideSeedBatch({
      current: {
        'visual-reaction-flash-33': {
          movementGuideStatus: 'published',
          movementGuide: {
            objective: 'old flash objective',
            instruction: 'old',
            coachScript: 'old',
            focusTags: ['simpleReaction'],
            easier: 'old',
            harder: 'old',
            movement: { baseMovement: 'handTouch', limbRule: 'free' },
          },
        },
      },
      seeds: [flash],
      status: 'published',
      allowedPresetIds: [flash.presetId],
    });
    expect(result.content['visual-reaction-flash-33']?.movementGuide?.objective).toBe(
      flash.movementGuide.objective,
    );
    expect(result.content['visual-reaction-flash-33']?.movementGuide?.coachScript).toContain('박수');
  });
});
