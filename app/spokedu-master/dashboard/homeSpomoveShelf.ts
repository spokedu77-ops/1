import type { SpomovePresetContentOverride } from '@/app/lib/spomove/spomoveOfficialAssets';
import type { OfficialSpomovePreset } from '../spomove/officialSpomovePresets';
import { getSpomoveCardDisplayModel, getSpomovePresetDisplayModel } from '../spomove/spomovePresetDisplayModel';

export type HomeSpomoveShelfCopy = {
  typeLabel: string;
  difficulty: string;
  title: string;
  supportMeta: string;
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
  const display = getSpomovePresetDisplayModel(preset, contentOverride);
  const card = getSpomoveCardDisplayModel(preset, contentOverride);
  const difficulty = card.meta.difficulty?.replace(/^난이도\s*/u, '').trim() || '';
  const trainingFocus = card.meta.trainingFocus?.trim() || '';
  return {
    typeLabel: card.meta.responseType?.trim() || '',
    difficulty,
    title: display.displayTitle,
    supportMeta: trainingFocus,
    support: [difficulty, trainingFocus]
      .map((value) => value?.replace(/^난이도\s*/u, '').trim())
      .filter((value): value is string => Boolean(value))
      .slice(0, 2)
      .join(' · '),
  };
}
