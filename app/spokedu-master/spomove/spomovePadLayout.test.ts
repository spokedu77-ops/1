import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { OFFICIAL_SPOMOVE_LIBRARY } from './officialSpomovePresets';
import { getSpomovePadLayoutVariant } from './spomovePadLayout';

describe('spomove pad layout variant', () => {
  it('uses compass layout only for arrow programs and dive presets', () => {
    const reactionOne = OFFICIAL_SPOMOVE_LIBRARY.find((preset) => preset.id === 'reaction-cognition-space-direction-01');
    const simonArrow = OFFICIAL_SPOMOVE_LIBRARY.find((preset) => preset.id === 'simon-pole-arrows-41');
    const divePresets = OFFICIAL_SPOMOVE_LIBRARY.filter((preset) => preset.programGroup === 'dive');

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
    const gridPreset = OFFICIAL_SPOMOVE_LIBRARY.find((preset) => preset.id === 'simon-pole-shape-06');
    const fullColorPreset = OFFICIAL_SPOMOVE_LIBRARY.find((preset) => preset.id === 'reaction-cognition-full-color-03');
    expect(gridPreset).toBeTruthy();
    expect(fullColorPreset).toBeTruthy();
    expect(getSpomovePadLayoutVariant(gridPreset!)).toBe('grid2x2');
    expect(getSpomovePadLayoutVariant(fullColorPreset!)).toBe('grid2x2');
  });

  it('renders separate square and diamond assets from the resolved variant', () => {
    const view = readFileSync(join(process.cwd(), 'app/spokedu-master/spomove/SpomovePadLayoutView.tsx'), 'utf8');
    expect(view).toContain("variant === 'compass'");
    expect(view).toContain('/images/spokedu/brand/spomat-layout.png');
    expect(view).toContain('/images/spokedu/brand/spomat-diamond-cutout.png');
  });
});
