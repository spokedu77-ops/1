import { describe, expect, it } from 'vitest';

import { buildOfficialSpomoveExpansionPresets, OFFICIAL_SPOMOVE_EXPANSION_COUNT } from './officialSpomovePresetExpansion';
import { OFFICIAL_SPOMOVE_CORE_COUNT } from './officialSpomovePresets';

describe('official SPOMOVE preset expansion builder', () => {
  it('builds the expected number of expansion presets', () => {
    const presets = buildOfficialSpomoveExpansionPresets(OFFICIAL_SPOMOVE_CORE_COUNT + 1);
    expect(presets).toHaveLength(OFFICIAL_SPOMOVE_EXPANSION_COUNT);
    expect(new Set(presets.map((preset) => preset.id)).size).toBe(OFFICIAL_SPOMOVE_EXPANSION_COUNT);
    expect(presets.every((preset) => preset.isReady)).toBe(true);
  });
});
