import type { SpomovePresetContentOverride } from '@/app/lib/spomove/spomoveOfficialAssets';
import type { OfficialSpomovePreset } from '../spomove/officialSpomovePresets';
import { getSpomoveCardDisplayModel, getSpomovePresetDisplayModel, resolveSpomovePublicCardSupport } from '../spomove/spomovePresetDisplayModel';

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
  const difficulty = card.publicMeta.difficulty;
  const trainingFocus = card.meta.trainingFocus?.trim() || '';
  const supportMeta = resolveSpomovePublicCardSupport(card.publicMeta, display.supportMetaParts) || trainingFocus;
  return {
    typeLabel: card.publicMeta.core || card.meta.responseType?.trim() || '',
    difficulty,
    title: card.title,
    supportMeta,
    support: supportMeta,
  };
}
