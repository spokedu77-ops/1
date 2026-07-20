import { SPOMOVE_HOME_FEATURED_SLOT_COUNT } from '@/app/lib/spomove/spomoveOfficialAssets';
import {
  findOfficialSpomovePreset,
  OFFICIAL_SPOMOVE_LIBRARY,
  type OfficialSpomovePreset,
} from '../spomove/officialSpomovePresets';

/** 관리자 슬롯이 비었을 때 쓰는 축/그룹 다양성 휴리스틱 (랜덤 아님). */
export function selectHeuristicFeaturedSpomove(
  count = SPOMOVE_HOME_FEATURED_SLOT_COUNT,
): OfficialSpomovePreset[] {
  const ready = OFFICIAL_SPOMOVE_LIBRARY.filter((preset) => preset.isReady);
  const selected: OfficialSpomovePreset[] = [];
  const axes = new Set<string>();
  const groups = new Set<string>();

  for (const preset of ready) {
    if (selected.length >= Math.min(3, count)) break;
    if (axes.has(preset.axis)) continue;
    selected.push(preset);
    axes.add(preset.axis);
    groups.add(preset.programGroup);
  }
  for (const preset of ready) {
    if (selected.length >= count) break;
    if (groups.has(preset.programGroup)) continue;
    selected.push(preset);
    groups.add(preset.programGroup);
  }
  for (const preset of ready) {
    if (selected.length >= count) break;
    if (!selected.some((item) => item.id === preset.id)) selected.push(preset);
  }
  return selected;
}

/**
 * 관리자가 고른 슬롯을 우선 배치하고, 빈 칸은 휴리스틱으로 채운다.
 * 슬롯 순서는 홈 카드 순서로 유지된다.
 */
export function resolveHomeFeaturedSpomove(
  explicitSlotIds: Array<string | null | undefined>,
  count = SPOMOVE_HOME_FEATURED_SLOT_COUNT,
): OfficialSpomovePreset[] {
  const slots: Array<OfficialSpomovePreset | null> = Array.from({ length: count }, () => null);
  const usedIds = new Set<string>();

  for (let index = 0; index < count; index += 1) {
    const rawId = explicitSlotIds[index];
    if (typeof rawId !== 'string' || !rawId.trim()) continue;
    const preset = findOfficialSpomovePreset(rawId.trim());
    if (!preset?.isReady || usedIds.has(preset.id)) continue;
    slots[index] = preset;
    usedIds.add(preset.id);
  }

  const fallbackPool: OfficialSpomovePreset[] = [];
  const pushFallback = (preset: OfficialSpomovePreset) => {
    if (usedIds.has(preset.id) || fallbackPool.some((item) => item.id === preset.id)) return;
    fallbackPool.push(preset);
  };
  for (const preset of selectHeuristicFeaturedSpomove(count)) pushFallback(preset);
  for (const preset of OFFICIAL_SPOMOVE_LIBRARY) {
    if (preset.isReady) pushFallback(preset);
  }

  let fallbackIndex = 0;
  for (let index = 0; index < count; index += 1) {
    if (slots[index]) continue;
    while (fallbackIndex < fallbackPool.length && usedIds.has(fallbackPool[fallbackIndex]!.id)) {
      fallbackIndex += 1;
    }
    const next = fallbackPool[fallbackIndex];
    if (!next) break;
    slots[index] = next;
    usedIds.add(next.id);
    fallbackIndex += 1;
  }

  return slots.filter((preset): preset is OfficialSpomovePreset => preset != null);
}
