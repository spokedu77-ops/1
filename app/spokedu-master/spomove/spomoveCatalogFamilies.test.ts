import { describe, expect, it } from 'vitest';

import { OFFICIAL_SPOMOVE_LIBRARY } from './officialSpomovePresets';
import {
  SPOMOVE_CATALOG_FAMILIES,
  filterPresetsByCatalogFamily,
  resolveSpomoveCatalogFamily,
} from './spomoveCatalogFamilies';

describe('SPOMOVE Catalog Families', () => {
  it('assigns every official preset to exactly one explicit commercial family', () => {
    for (const preset of OFFICIAL_SPOMOVE_LIBRARY) {
      const matches = SPOMOVE_CATALOG_FAMILIES.filter((family) =>
        family.programGroups.includes(preset.programGroup),
      );
      expect(matches, preset.id).toHaveLength(1);
      expect(resolveSpomoveCatalogFamily(preset)).toBe(matches[0]);
    }
  });

  it('groups related execution catalogs without changing preset data', () => {
    const choice = filterPresetsByCatalogFamily(OFFICIAL_SPOMOVE_LIBRARY, 'conflict-choice');
    expect(new Set(choice.map((preset) => preset.programGroup))).toEqual(
      new Set(['simon', 'flanker', 'stroop']),
    );
    expect(choice.every((preset) => OFFICIAL_SPOMOVE_LIBRARY.includes(preset))).toBe(true);
  });

  it('keeps DIVE and bonus execution data in one user-facing family', () => {
    const dive = filterPresetsByCatalogFamily(OFFICIAL_SPOMOVE_LIBRARY, 'dive-flow');
    expect(dive.some((preset) => preset.programGroup === 'dive')).toBe(true);
    const family = SPOMOVE_CATALOG_FAMILIES.find((item) => item.id === 'dive-flow');
    expect(family?.programGroups).toEqual(['dive', 'bonus']);
    expect(dive.every((preset) => preset.programGroup === 'dive' || preset.programGroup === 'bonus')).toBe(true);
  });
});
