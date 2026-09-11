import { SPOMOVE_HUB_FAMILY_FEATURED_SLOT_COUNT } from '@/app/lib/spomove/spomoveOfficialAssets';
import { isHubListedPreset } from '../spomove/movements/isHubVisiblePreset';
import {
  SPOMOVE_CATALOG_FAMILIES,
  filterPresetsByCatalogFamily,
  resolveSpomoveCatalogFamily,
  type SpomoveCatalogFamilyId,
} from '../spomove/spomoveCatalogFamilies';
import {
  findOfficialSpomovePreset,
  type OfficialSpomovePreset,
} from '../spomove/officialSpomovePresets';
import { sortPresetsByPublicCatalogOrder } from '../spomove/spomovePublicCatalogOrder';

export type SpomoveHubFamilyFeaturedSlots = Record<
  SpomoveCatalogFamilyId,
  Array<string | null>
>;

export function emptyHubFamilyFeaturedSlots(): SpomoveHubFamilyFeaturedSlots {
  return Object.fromEntries(
    SPOMOVE_CATALOG_FAMILIES.map((family) => [
      family.id,
      Array.from({ length: SPOMOVE_HUB_FAMILY_FEATURED_SLOT_COUNT }, () => null),
    ]),
  ) as SpomoveHubFamilyFeaturedSlots;
}

function emptySlotRow(): Array<string | null> {
  return Array.from({ length: SPOMOVE_HUB_FAMILY_FEATURED_SLOT_COUNT }, () => null);
}

function normalizeSlotRow(source: unknown): Array<string | null> {
  const values = Array.isArray(source) ? source : [];
  return Array.from({ length: SPOMOVE_HUB_FAMILY_FEATURED_SLOT_COUNT }, (_, index) => {
    const raw = values[index];
    if (typeof raw !== 'string') return null;
    const id = raw.trim();
    if (!id) return null;
    const preset = findOfficialSpomovePreset(id);
    return preset && isHubListedPreset(preset) ? preset.id : null;
  });
}

export function normalizeHubFamilyFeaturedSlots(raw: unknown): SpomoveHubFamilyFeaturedSlots {
  const families =
    raw && typeof raw === 'object' && !Array.isArray(raw)
      ? ((raw as { families?: unknown }).families ?? raw)
      : {};
  const source =
    families && typeof families === 'object' && !Array.isArray(families)
      ? (families as Record<string, unknown>)
      : {};

  const next = emptyHubFamilyFeaturedSlots();
  for (const family of SPOMOVE_CATALOG_FAMILIES) {
    const row = normalizeSlotRow(source[family.id]);
    const used = new Set<string>();
    next[family.id] = row.map((id) => {
      if (!id || used.has(id)) return null;
      const preset = findOfficialSpomovePreset(id);
      if (!preset || resolveSpomoveCatalogFamily(preset).id !== family.id) return null;
      used.add(id);
      return id;
    });
  }
  return next;
}

/**
 * 테마 미리보기 4칸: 관리자 슬롯을 위치 그대로 쓰고, 빈 칸만 공식 카탈로그 앞에서 채운다.
 * 공개 카탈로그 전체 순서는 바꾸지 않는다.
 */
export function resolveHubFamilyFeaturedSpomove(
  familyId: SpomoveCatalogFamilyId,
  explicitSlotIds: Array<string | null | undefined> | undefined,
  visiblePresets: readonly OfficialSpomovePreset[],
  count = SPOMOVE_HUB_FAMILY_FEATURED_SLOT_COUNT,
): OfficialSpomovePreset[] {
  const familyPool = sortPresetsByPublicCatalogOrder(
    filterPresetsByCatalogFamily(visiblePresets, familyId).filter(isHubListedPreset),
  );
  const slots: Array<OfficialSpomovePreset | null> = Array.from({ length: count }, () => null);
  const usedIds = new Set<string>();
  const source = explicitSlotIds ?? emptySlotRow();

  for (let index = 0; index < count; index += 1) {
    const rawId = source[index];
    if (typeof rawId !== 'string' || !rawId.trim()) continue;
    const preset = familyPool.find((item) => item.id === rawId.trim());
    if (!preset || usedIds.has(preset.id)) continue;
    slots[index] = preset;
    usedIds.add(preset.id);
  }

  let fallbackIndex = 0;
  for (let index = 0; index < count; index += 1) {
    if (slots[index]) continue;
    while (fallbackIndex < familyPool.length && usedIds.has(familyPool[fallbackIndex]!.id)) {
      fallbackIndex += 1;
    }
    const next = familyPool[fallbackIndex];
    if (!next) break;
    slots[index] = next;
    usedIds.add(next.id);
    fallbackIndex += 1;
  }

  return slots.filter((preset): preset is OfficialSpomovePreset => preset != null);
}
