import { describe, expect, it } from 'vitest';
import { OFFICIAL_SPOMOVE_LIBRARY } from '../spomove/officialSpomovePresets';
import { isHubListedPreset } from '../spomove/movements/isHubVisiblePreset';
import { filterPresetsByCatalogFamily } from '../spomove/spomoveCatalogFamilies';
import { sortPresetsByPublicCatalogOrder } from '../spomove/spomovePublicCatalogOrder';
import {
  normalizeHubFamilyFeaturedSlots,
  resolveHubFamilyFeaturedSpomove,
} from './spomoveHubFamilyFeatured';

const listed = OFFICIAL_SPOMOVE_LIBRARY.filter(isHubListedPreset);

describe('resolveHubFamilyFeaturedSpomove', () => {
  it('슬롯이 비면 해당 테마 공식 카탈로그 앞 4개를 쓴다', () => {
    const familyId = 'signal-response';
    const catalogFirst = sortPresetsByPublicCatalogOrder(
      filterPresetsByCatalogFamily(listed, familyId),
    ).slice(0, 4);
    expect(resolveHubFamilyFeaturedSpomove(familyId, [null, null, null, null], listed)).toEqual(
      catalogFirst,
    );
  });

  it('명시한 슬롯 위치를 유지하고 빈 칸만 카탈로그 앞에서 채운다', () => {
    const familyId = 'conflict-choice';
    const pool = sortPresetsByPublicCatalogOrder(filterPresetsByCatalogFamily(listed, familyId));
    const picked = pool[5];
    expect(picked).toBeTruthy();
    const resolved = resolveHubFamilyFeaturedSpomove(familyId, [null, picked!.id, null, null], listed);
    expect(resolved).toHaveLength(4);
    expect(resolved[1]?.id).toBe(picked!.id);
    expect(resolved[0]?.id).toBe(pool[0]?.id);
    expect(new Set(resolved.map((preset) => preset.id)).size).toBe(4);
  });

  it('다른 테마·중복 ID는 무시한다', () => {
    const familyId = 'sequence-memory';
    const own = sortPresetsByPublicCatalogOrder(filterPresetsByCatalogFamily(listed, familyId))[0];
    const other = sortPresetsByPublicCatalogOrder(
      filterPresetsByCatalogFamily(listed, 'dive-flow'),
    )[0];
    expect(own && other).toBeTruthy();
    const resolved = resolveHubFamilyFeaturedSpomove(
      familyId,
      [own!.id, own!.id, other!.id, 'not-a-preset'],
      listed,
    );
    expect(resolved[0]?.id).toBe(own!.id);
    expect(resolved.filter((preset) => preset.id === own!.id)).toHaveLength(1);
    expect(resolved.some((preset) => preset.id === other!.id)).toBe(false);
  });
});

describe('normalizeHubFamilyFeaturedSlots', () => {
  it('테마별 4칸만 남기고 잘못된 ID는 비운다', () => {
    const familyId = 'dive-flow';
    const own = filterPresetsByCatalogFamily(listed, familyId)[0];
    const other = filterPresetsByCatalogFamily(listed, 'signal-response')[0];
    const normalized = normalizeHubFamilyFeaturedSlots({
      families: {
        [familyId]: [own?.id, other?.id, own?.id, 'missing'],
      },
    });
    expect(normalized[familyId][0]).toBe(own?.id);
    expect(normalized[familyId][1]).toBeNull();
    expect(normalized[familyId][2]).toBeNull();
    expect(normalized[familyId][3]).toBeNull();
    expect(normalized['signal-response']).toEqual([null, null, null, null]);
  });
});
