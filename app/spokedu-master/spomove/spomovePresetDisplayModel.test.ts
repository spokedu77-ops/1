import { describe, expect, it } from 'vitest';

import { OFFICIAL_SPOMOVE_LIBRARY } from './officialSpomovePresets';
import {
  buildSpomoveCardTags,
  buildSpomoveGuideDisplayModel,
  buildSpomoveProgramGroupSections,
  getSpomovePresetDisplayModel,
  sortSpomovePresetsByCatalogOrder,
  sortSpomovePresetsByDisplayTitle,
} from './spomovePresetDisplayModel';

describe('spomove preset display model', () => {
  it('uses unique program+displayTitle pairs and runtime-aware duration labels without BGM copy', () => {
    const keys = OFFICIAL_SPOMOVE_LIBRARY.map((preset) => {
      const display = getSpomovePresetDisplayModel(preset);
      return `${display.programLabel}::${display.displayTitle}`;
    });
    expect(new Set(keys).size).toBe(OFFICIAL_SPOMOVE_LIBRARY.length);

    const visual = OFFICIAL_SPOMOVE_LIBRARY.find((preset) => preset.id === 'visual-reaction-blackout-37');
    expect(visual).toBeTruthy();
    expect(getSpomovePresetDisplayModel(visual!).durationLabel).not.toMatch(/BGM/i);
    expect(visual!.programGroup).toBe('simon');

    const dive = OFFICIAL_SPOMOVE_LIBRARY.find((preset) => preset.id === 'dive-random');
    expect(dive).toBeTruthy();
    expect(getSpomovePresetDisplayModel(dive!).durationLabel.length).toBeGreaterThan(0);

    for (const preset of OFFICIAL_SPOMOVE_LIBRARY) {
      const settingTag = buildSpomoveCardTags(preset).find((tag) => tag.key === 'setting');
      const bodyFunctionTag = buildSpomoveCardTags(preset).find((tag) => tag.key === 'bodyFunction');
      expect(settingTag?.value).not.toMatch(/BGM/i);
      expect((bodyFunctionTag?.value.split(' · ') ?? []).filter(Boolean).length).toBeLessThanOrEqual(2);
    }
  });

  it('sortSpomovePresetsByCatalogOrder keeps official catalog order', () => {
    const sample = OFFICIAL_SPOMOVE_LIBRARY.slice(0, 12);
    const shuffled = [...sample].reverse();
    const sorted = sortSpomovePresetsByCatalogOrder(shuffled);
    const orders = sorted.map((preset) => preset.sortOrder);
    expect([...orders].sort((a, b) => a - b)).toEqual(orders);
  });

  it('buildSpomoveProgramGroupSections groups favorites by activity category', () => {
    const reaction = OFFICIAL_SPOMOVE_LIBRARY.find((preset) => preset.programGroup === 'reaction-cognition');
    const visual = OFFICIAL_SPOMOVE_LIBRARY.find((preset) => preset.programGroup === 'visual-reaction');
    const dive = OFFICIAL_SPOMOVE_LIBRARY.find((preset) => preset.programGroup === 'dive');
    expect(reaction && visual && dive).toBeTruthy();

    const sections = buildSpomoveProgramGroupSections([dive!, reaction!, visual!, reaction!]);
    expect(sections.map((section) => section.programGroup)).toEqual([
      'reaction-cognition',
      'visual-reaction',
      'dive',
    ]);
    expect(sections[0]?.presets.every((preset) => preset.programGroup === 'reaction-cognition')).toBe(true);
    expect(sections[1]?.presets.every((preset) => preset.programGroup === 'visual-reaction')).toBe(true);
  });

  it('sortSpomovePresetsByDisplayTitle sorts by Korean display title', () => {
    const sample = OFFICIAL_SPOMOVE_LIBRARY.slice(0, 12);
    const shuffled = [...sample].reverse();
    const sorted = sortSpomovePresetsByDisplayTitle(shuffled);
    const titles = sorted.map((preset) => getSpomovePresetDisplayModel(preset).displayTitle);
    expect([...titles].sort((a, b) => a.localeCompare(b, 'ko'))).toEqual(titles);
  });

  it('displayTitle omits the programLabel prefix already shown as a card tag', () => {
    for (const preset of OFFICIAL_SPOMOVE_LIBRARY) {
      const display = getSpomovePresetDisplayModel(preset);
      const compactProgram = display.programLabel.replace(/\s+/g, '');
      expect(display.displayTitle.startsWith(display.programLabel)).toBe(false);
      expect(display.displayTitle.startsWith(`${compactProgram} ·`)).toBe(false);
      expect(display.displayTitle.startsWith(`${compactProgram} `)).toBe(false);
    }
  });

  it('buildSpomoveGuideDisplayModel uses structured movement guide fields as the display source', () => {
    const preset = OFFICIAL_SPOMOVE_LIBRARY.find((item) => item.id === 'reaction-cognition-space-direction-01');
    expect(preset).toBeTruthy();

    const model = buildSpomoveGuideDisplayModel({
      preset: preset!,
      audience: 'public',
      contentOverride: {
        movementGuideStatus: 'published',
        movementGuide: {
          movement: { baseMovement: 'twoLegJump', limbRule: 'free' },
          instruction: 'Move to the matching color.',
          coachScript: 'Look first, then jump together.',
          focusTags: ['choiceReaction', 'lowerBodyCoordination', 'landingControl'],
          easier: 'Step instead of jumping.',
          harder: 'Reduce cue time and add a return jump.',
          variations: {
            movement: 'Use foot tap or lunge reach instead.',
          },
        },
      },
    });

    expect(model.guideMode).toBe('published');
    expect(model.isOfficialGuide).toBe(true);
    expect(model.recommendedMovementLabel).toBeTruthy();
    expect(model.instruction).toBe('Move to the matching color.');
    expect(model.coachScript).toBe('Look first, then jump together.');
    expect(model.focusTags).toHaveLength(3);
    expect(model.movementVariation).toBe('Use foot tap or lunge reach instead.');
    expect(model.contentReadiness).toBe('home-ready');
  });

  it('keeps draft structured guide fields out of public official guide output', () => {
    const preset = OFFICIAL_SPOMOVE_LIBRARY.find((item) => item.id === 'reaction-cognition-space-direction-01');
    expect(preset).toBeTruthy();

    const model = buildSpomoveGuideDisplayModel({
      preset: preset!,
      audience: 'public',
      contentOverride: {
        movementGuideStatus: 'draft',
        movementGuide: {
          movement: { baseMovement: 'twoLegJump', limbRule: 'free' },
          instruction: 'Draft instruction.',
          coachScript: 'Draft coach script.',
          focusTags: ['choiceReaction'],
          easier: 'Draft easier.',
          harder: 'Draft harder.',
        },
      },
    });

    expect(model.guideMode).toBe('preparing');
    expect(model.isOfficialGuide).toBe(false);
    expect(model.recommendedMovementLabel).toBeNull();
    expect(model.instruction).toBeNull();
    expect(model.coachScript).toBeNull();
    expect(model.focusTags).toEqual([]);
    expect(model.easier).toBeNull();
    expect(model.harder).toBeNull();
    expect('fallbackReference' in model).toBe(false);
  });

  it('shows only legacy manual content publicly when structured guide is draft', () => {
    const preset = OFFICIAL_SPOMOVE_LIBRARY.find((item) => item.id === 'reaction-cognition-space-direction-01');
    expect(preset).toBeTruthy();

    const model = buildSpomoveGuideDisplayModel({
      preset: preset!,
      audience: 'public',
      contentOverride: {
        activityMethod: 'Legacy method.',
        activityConcept: 'Legacy concept.',
        movementGuide: {
          instruction: 'Draft instruction.',
        },
      },
    });

    expect(model.guideMode).toBe('legacy');
    expect(model.isOfficialGuide).toBe(false);
    expect(model.instruction).toBeNull();
    expect(model.legacyManual).toEqual({
      activityMethod: 'Legacy method.',
      activityConcept: 'Legacy concept.',
    });
  });

  it('returns admin preview issues and fallback reference without publishing invalid draft fields', () => {
    const preset = OFFICIAL_SPOMOVE_LIBRARY.find((item) => item.id === 'reaction-cognition-space-direction-01');
    expect(preset).toBeTruthy();

    const model = buildSpomoveGuideDisplayModel({
      preset: preset!,
      audience: 'adminPreview',
      contentOverride: {
        movementGuideStatus: 'published',
        movementGuide: {
          instruction: 'Incomplete published guide.',
        },
      },
    });

    expect(model.guideMode).toBe('invalidPreview');
    expect(model.instruction).toBe('Incomplete published guide.');
    if (model.audience !== 'adminPreview') throw new Error('Expected admin preview model');
    expect(model.validationIssues.length).toBeGreaterThan(0);
    expect(model.fallbackReference?.instruction).toBeTruthy();
  });
});
