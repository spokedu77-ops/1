import type { SpomovePresetContentOverride } from '@/app/lib/spomove/spomoveOfficialAssets';
import type { OfficialSpomovePreset } from '../spomove/officialSpomovePresets';
import { getSpomoveCardDisplayModel } from '../spomove/spomovePresetDisplayModel';

export type HomeSpomoveShelfCopy = {
  typeLabel: string;
  title: string;
  support: string;
};

/**
 * Home SPOMOVE shelf: same slot = same semantic axis.
 * Type = responseType (axis). Support = difficulty · trainingFocus only.
 */
export function getHomeSpomoveShelfCopy(
  preset: OfficialSpomovePreset,
  contentOverride?: SpomovePresetContentOverride,
): HomeSpomoveShelfCopy {
  const card = getSpomoveCardDisplayModel(preset, contentOverride);
  return {
    typeLabel: card.meta.responseType?.trim() || '',
    title: card.title,
    support: [card.meta.difficulty, card.meta.trainingFocus]
      .map((value) => value?.replace(/^난이도\s*/u, '').trim())
      .filter((value): value is string => Boolean(value))
      .slice(0, 2)
      .join(' · '),
  };
}
