import { describe, expect, it } from 'vitest';

import { OFFICIAL_SPOMOVE_LIBRARY } from './officialSpomovePresets';
import { getSpomovePadLayoutVariant } from './spomovePadLayout';

describe('spomove pad layout variant', () => {
  it('uses compass layout for reaction cognition 1, dive presets, and simon arrow level 1', () => {
    const reactionOne = OFFICIAL_SPOMOVE_LIBRARY.find((preset) => preset.id === 'reaction-cognition-space-direction-01');
    const simonArrow = OFFICIAL_SPOMOVE_LIBRARY.find((preset) => preset.id === 'simon-pole-shape-06');
    const divePresets = OFFICIAL_SPOMOVE_LIBRARY.filter(
      (preset) => preset.programGroup === 'dive' || preset.programGroup === 'bonus',
    );

    expect(reactionOne).toBeTruthy();
    expect(simonArrow).toBeTruthy();
    expect(divePresets.length).toBeGreaterThan(0);

    expect(getSpomovePadLayoutVariant(reactionOne!)).toBe('compass');
    expect(getSpomovePadLayoutVariant(simonArrow!)).toBe('compass');
    for (const preset of divePresets) {
      expect(getSpomovePadLayoutVariant(preset)).toBe('compass');
    }
  });

  it('keeps grid2x2 as the default for other presets', () => {
    const gridPreset = OFFICIAL_SPOMOVE_LIBRARY.find((preset) => preset.id === 'simon-pole-arrows-41');
    expect(gridPreset).toBeTruthy();
    expect(getSpomovePadLayoutVariant(gridPreset!)).toBe('grid2x2');
  });
});
