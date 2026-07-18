import { describe, expect, it } from 'vitest';
import { OFFICIAL_SPOMOVE_LIBRARY } from './officialSpomovePresets';
import { buildSpomoveCardTags, getSpomovePresetDisplayModel, sortSpomovePresetsByDisplayTitle } from './spomovePresetDisplayModel';

describe('spomove preset display model', () => {
  it('uses unique program+displayTitle pairs and runtime-aware duration labels without BGM copy', () => {
    const keys = OFFICIAL_SPOMOVE_LIBRARY.map((preset) => {
      const display = getSpomovePresetDisplayModel(preset);
      return `${display.programLabel}::${display.displayTitle}`;
    });
    expect(new Set(keys).size).toBe(OFFICIAL_SPOMOVE_LIBRARY.length);

    const visual = OFFICIAL_SPOMOVE_LIBRARY.find((preset) => preset.id === 'visual-reaction-blackout-37');
    expect(visual).toBeTruthy();
    expect(getSpomovePresetDisplayModel(visual!).durationLabel).toBe('3초 · 20회');

    const dive = OFFICIAL_SPOMOVE_LIBRARY.find((preset) => preset.id === 'dive-random');
    expect(dive).toBeTruthy();
    expect(getSpomovePresetDisplayModel(dive!).durationLabel).toMatch(/^세션 \d+초/);

    for (const preset of OFFICIAL_SPOMOVE_LIBRARY) {
      const settingTag = buildSpomoveCardTags(preset).find((tag) => tag.key === 'setting');
      const bodyFunctionTag = buildSpomoveCardTags(preset).find((tag) => tag.key === 'bodyFunction');
      expect(settingTag?.value).not.toMatch(/BGM/i);
      expect((bodyFunctionTag?.value.split(' · ') ?? []).filter(Boolean).length).toBeLessThanOrEqual(2);
    }
  });

  it('sortSpomovePresetsByDisplayTitle sorts by Korean display title', () => {
    const sample = OFFICIAL_SPOMOVE_LIBRARY.slice(0, 12);
    const shuffled = [...sample].reverse();
    const sorted = sortSpomovePresetsByDisplayTitle(shuffled);
    const titles = sorted.map((preset) => getSpomovePresetDisplayModel(preset).displayTitle);
    expect([...titles].sort((a, b) => a.localeCompare(b, 'ko'))).toEqual(titles);
  });

  it('displayTitle omits programLabel prefix already shown as the card tag', () => {
    for (const preset of OFFICIAL_SPOMOVE_LIBRARY) {
      const display = getSpomovePresetDisplayModel(preset);
      const compactProgram = display.programLabel.replace(/\s+/g, '');
      expect(display.displayTitle.startsWith(display.programLabel)).toBe(false);
      expect(display.displayTitle.startsWith(`${compactProgram} ·`)).toBe(false);
      expect(display.displayTitle.startsWith(`${compactProgram} `)).toBe(false);
    }

    const rc = OFFICIAL_SPOMOVE_LIBRARY.find((preset) => preset.id === 'reaction-cognition-space-direction-01');
    expect(getSpomovePresetDisplayModel(rc!).displayTitle).toBe('공간 방향');

    const magic = OFFICIAL_SPOMOVE_LIBRARY.find((preset) => preset.id === 'visual-reaction-blackout-37');
    expect(getSpomovePresetDisplayModel(magic!).displayTitle).toBe('매직 아이 L1');

    for (const preset of OFFICIAL_SPOMOVE_LIBRARY) {
      expect(getSpomovePresetDisplayModel(preset).displayTitle).not.toMatch(/^\d+번\b/);
      expect(getSpomovePresetDisplayModel(preset).displayTitle).not.toMatch(/\d+번\s*[·:]/);
    }
  });
});
