import { describe, expect, it } from 'vitest';

import { publishSpomoveMovementGuide } from './spomoveGuideContract';
import { resolveSpomoveBriefingReadiness } from './spomoveBriefingReadiness';
import { applySpomoveGuideSeedBatch } from './applySpomoveGuideSeedBatch';
import { findOfficialSpomovePreset, OFFICIAL_SPOMOVE_LIBRARY } from '@/app/spokedu-master/spomove/officialSpomovePresets';
import { isHubListedPreset } from '@/app/spokedu-master/spomove/movements/isHubVisiblePreset';
import {
  SPOMOVE_SEQUENTIAL_MEMORY_GUIDE_SEEDS,
  SPOMOVE_SEQUENTIAL_MEMORY_SEED_PRESET_IDS,
} from './spomoveSequentialMemoryGuides';
import {
  SPOMOVE_FLANKER_GUIDE_SEEDS,
  SPOMOVE_FLANKER_SEED_PRESET_IDS,
} from './spomoveFlankerGuides';
import { SPOMOVE_SIMON_GUIDE_SEEDS, SPOMOVE_SIMON_SEED_PRESET_IDS } from './spomoveSimonGuides';
import { SPOMOVE_DIVE_GUIDE_SEEDS, SPOMOVE_DIVE_SEED_PRESET_IDS } from './spomoveDiveGuides';
import { SPOMOVE_STROOP_GUIDE_SEEDS, SPOMOVE_STROOP_SEED_PRESET_IDS } from './spomoveStroopGuides';
import type { SpomoveGuideSeedBase } from './spomoveGuideSeedMerge';

const BANNED = [
  '집중력을 향상',
  '순발력을 향상',
  '정확하게 수행',
  '아이 수준에 맞게',
  '화면을 집중해서',
  '보너스타임',
  '센서 판정',
  '자동 채점',
  '반응시간',
  '정확도 %',
];

const ALL_SEEDS: SpomoveGuideSeedBase[] = [
  ...SPOMOVE_SEQUENTIAL_MEMORY_GUIDE_SEEDS,
  ...SPOMOVE_FLANKER_GUIDE_SEEDS,
  ...SPOMOVE_SIMON_GUIDE_SEEDS,
  ...SPOMOVE_DIVE_GUIDE_SEEDS,
  ...SPOMOVE_STROOP_GUIDE_SEEDS,
];

describe('remainingCommercialGuides', () => {
  it('covers exact remaining active counts and ids', () => {
    const active = OFFICIAL_SPOMOVE_LIBRARY.filter(isHubListedPreset);
    const by = (g: string) => active.filter((p) => p.programGroup === g).map((p) => p.id).sort();
    expect(by('sequential-memory')).toEqual([...SPOMOVE_SEQUENTIAL_MEMORY_SEED_PRESET_IDS].sort());
    expect(by('flanker')).toEqual([...SPOMOVE_FLANKER_SEED_PRESET_IDS].sort());
    expect(by('simon')).toEqual([...SPOMOVE_SIMON_SEED_PRESET_IDS].sort());
    expect(by('dive')).toEqual([...SPOMOVE_DIVE_SEED_PRESET_IDS].sort());
    expect(by('stroop')).toEqual([...SPOMOVE_STROOP_SEED_PRESET_IDS].sort());
    expect(ALL_SEEDS).toHaveLength(39);
  });

  it('publishes and is briefing-ready for every remaining seed', () => {
    for (const seed of ALL_SEEDS) {
      const preset = findOfficialSpomovePreset(seed.presetId)!;
      expect(publishSpomoveMovementGuide(seed.movementGuide, preset), seed.presetId).not.toBeNull();
      expect(
        resolveSpomoveBriefingReadiness({
          preset,
          contentOverride: {
            movementGuide: seed.movementGuide,
            movementGuideStatus: 'published',
          },
        }).readiness,
        seed.presetId,
      ).toBe('ready');
      const blob = JSON.stringify(seed.movementGuide);
      for (const banned of BANNED) {
        expect(blob.includes(banned), `${seed.presetId}: ${banned}`).toBe(false);
      }
    }
  });

  it('encodes mechanics contracts for refine pilots and memory/dive', () => {
    const simonArrow = SPOMOVE_SIMON_GUIDE_SEEDS.find((s) => s.presetId === 'simon-pole-arrows-41')!;
    expect(simonArrow.overwriteGuideFields).toBe(true);
    expect(JSON.stringify(simonArrow.movementGuide)).toMatch(/방향/);
    expect(JSON.stringify(simonArrow.movementGuide)).not.toMatch(/화살표 색/);

    const flanker = SPOMOVE_FLANKER_GUIDE_SEEDS.find((s) => s.presetId === 'flanker-uniform-07')!;
    expect(flanker.overwriteGuideFields).toBe(true);
    expect(flanker.movementGuide.objective).toMatch(/화살표/);
    expect(flanker.movementGuide.objective).toMatch(/방향/);
    expect(flanker.movementGuide.objective).not.toMatch(/목표 색/);

    const stroop = SPOMOVE_STROOP_GUIDE_SEEDS.find((s) => s.presetId === 'stroop-arrow-bg-47')!;
    expect(stroop.overwriteGuideFields).toBe(true);
    expect(JSON.stringify(stroop.movementGuide)).toMatch(/의미|잉크/);
    expect(JSON.stringify(stroop.movementGuide)).not.toMatch(/화살표.*배경|배경.*화살표/);

    const mem = SPOMOVE_SEQUENTIAL_MEMORY_GUIDE_SEEDS.find(
      (s) => s.presetId === 'sequential-memory-3color-09',
    )!;
    expect(JSON.stringify(mem.movementGuide)).toMatch(/기억|재현|제시/);

    const dive = SPOMOVE_DIVE_GUIDE_SEEDS.find((s) => s.presetId === 'dive-color-gate-61')!;
    expect(JSON.stringify(dive.movementGuide)).not.toMatch(/센서/);
  });

  it('batch merge only touches allowed remaining ids', () => {
    const otherId = 'reaction-cognition-space-direction-01';
    const other = {
      movementGuideStatus: 'published' as const,
      movementGuide: { objective: 'keep rc' },
    };
    const result = applySpomoveGuideSeedBatch({
      current: { [otherId]: other },
      seeds: SPOMOVE_DIVE_GUIDE_SEEDS,
      status: 'draft',
      allowedPresetIds: SPOMOVE_DIVE_SEED_PRESET_IDS,
    });
    expect(result.content[otherId]).toEqual(other);
    expect(result.changedPresetIds.sort()).toEqual([...SPOMOVE_DIVE_SEED_PRESET_IDS].sort());
  });

  it('stroop catalog title follows word runtime for L2', () => {
    const preset = findOfficialSpomovePreset('stroop-arrow-bg-47')!;
    expect(preset.engine).toEqual({ mode: 'stroop', level: 2 });
    expect(preset.title).toMatch(/단어/);
    expect(preset.description).toMatch(/의미|잉크/);
    expect(preset.description).not.toMatch(/화살표 방향이 충돌/);
  });
});
