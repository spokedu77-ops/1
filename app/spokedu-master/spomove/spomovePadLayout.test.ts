import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { OFFICIAL_SPOMOVE_LIBRARY } from './officialSpomovePresets';
import { getSpomovePadLayoutVariant } from './spomovePadLayout';

describe('spomove pad layout variant', () => {
  it('uses compass layout only for arrow programs and action move', () => {
    const reactionOne = OFFICIAL_SPOMOVE_LIBRARY.find((preset) => preset.id === 'reaction-cognition-space-direction-01');
    const simonArrow = OFFICIAL_SPOMOVE_LIBRARY.find((preset) => preset.id === 'simon-pole-arrows-41');
    const actionMove = OFFICIAL_SPOMOVE_LIBRARY.find((preset) => preset.id === 'dive-standard');
    const motionGate = OFFICIAL_SPOMOVE_LIBRARY.find((preset) => preset.id === 'dive-color-gate-61');

    expect(reactionOne).toBeTruthy();
    expect(simonArrow).toBeTruthy();
    expect(actionMove).toBeTruthy();
    expect(motionGate).toBeTruthy();

    expect(getSpomovePadLayoutVariant(reactionOne!)).toBe('compass');
    expect(getSpomovePadLayoutVariant(simonArrow!)).toBe('compass');
    expect(getSpomovePadLayoutVariant(actionMove!)).toBe('compass');
    expect(getSpomovePadLayoutVariant(motionGate!)).toBe('grid2x2');
  });

  it('keeps grid2x2 as the default for other presets', () => {
    const gridPreset = OFFICIAL_SPOMOVE_LIBRARY.find((preset) => preset.id === 'simon-pole-shape-06');
    const fullColorPreset = OFFICIAL_SPOMOVE_LIBRARY.find((preset) => preset.id === 'reaction-cognition-full-color-03');
    const foodSizePreset = OFFICIAL_SPOMOVE_LIBRARY.find((preset) => preset.id === 'flanker-arrow-05');
    expect(gridPreset).toBeTruthy();
    expect(fullColorPreset).toBeTruthy();
    expect(foodSizePreset).toBeTruthy();
    expect(getSpomovePadLayoutVariant(gridPreset!)).toBe('grid2x2');
    expect(getSpomovePadLayoutVariant(fullColorPreset!)).toBe('grid2x2');
    expect(getSpomovePadLayoutVariant(foodSizePreset!)).toBe('grid2x2');
  });

  it('renders separate square and diamond assets from the resolved variant', () => {
    const view = readFileSync(join(process.cwd(), 'app/spokedu-master/spomove/SpomovePadLayoutView.tsx'), 'utf8');
    expect(view).toContain("variant === 'compass'");
    expect(view).toContain('/images/spokedu/brand/spomat-square-cutout.png');
    expect(view).toContain('/images/spokedu/brand/spomat-diamond-cutout.png');
  });
});
