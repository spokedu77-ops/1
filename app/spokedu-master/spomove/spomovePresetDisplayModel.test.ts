import { describe, expect, it } from 'vitest';
import { OFFICIAL_SPOMOVE_LIBRARY } from './officialSpomovePresets';
import { getSpomovePresetDisplayModel } from './spomovePresetDisplayModel';

describe('spomove preset display model', () => {
  it('uses unique preset titles and runtime-aware duration labels', () => {
    const titles = OFFICIAL_SPOMOVE_LIBRARY.map((preset) => getSpomovePresetDisplayModel(preset).displayTitle);
    expect(new Set(titles).size).toBe(OFFICIAL_SPOMOVE_LIBRARY.length);

    const visual = OFFICIAL_SPOMOVE_LIBRARY.find((preset) => preset.id === 'visual-reaction-blackout-37');
    expect(visual).toBeTruthy();
    expect(getSpomovePresetDisplayModel(visual!).durationLabel).toBe('3초 · 20회 · BGM 자동');

    const dive = OFFICIAL_SPOMOVE_LIBRARY.find((preset) => preset.programGroup === 'bonus');
    expect(dive).toBeTruthy();
    expect(getSpomovePresetDisplayModel(dive!).durationLabel).toMatch(/^세션 \d+초$/);
  });
});
