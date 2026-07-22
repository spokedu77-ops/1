/**
 * O2 — 전면(reaction-full) 6 Theme 공식 대표값.
 * Physical Contract: docs/SPOMOVE_MOVEMENT_PHYSICAL_CONTRACT.md
 */
import type { ActivityOperationPatch } from '../operations/operationTypes';
import type { MovementPick } from '../movements/movementTypes';
import type { OfficialSpomovePreset } from '../officialSpomovePresets';
import type { SpomoveColorThemeId } from '@/app/admin/spomove/training/_player/lib/spomoveVariantThemeConfig';

export type FullThemeSeed = {
  recommendedMovement: MovementPick;
  recommendedOperation: ActivityOperationPatch;
  /** Preset.cueSeconds 권장 (responseWindow 테마) */
  cueSeconds?: number;
};

/** Theme → 대표 움직임·운영 (전면 l3만) */
export const FULL_THEME_SEEDS: Record<
  Exclude<SpomoveColorThemeId, 'emotion'>,
  FullThemeSeed
> = {
  color: {
    recommendedMovement: { baseMovement: 'twoLegJump', limbRule: 'free' },
    recommendedOperation: {
      startZone: 'onMat',
      participantScale: 'individual',
      equipment: { mode: 'none' },
      timing: { pattern: 'continuous' },
      participationFormat: 'independent',
    },
    cueSeconds: 3,
  },
  fruit: {
    recommendedMovement: { baseMovement: 'singleLegHop', limbRule: 'free' },
    recommendedOperation: {
      startZone: 'onMat',
      participantScale: 'individual',
      equipment: { mode: 'none' },
      timing: { pattern: 'responseWindow' },
      participationFormat: 'independent',
    },
    cueSeconds: 4,
  },
  nature: {
    recommendedMovement: { baseMovement: 'lungeReach', limbRule: 'free' },
    recommendedOperation: {
      startZone: 'adjacentToMat',
      participantScale: 'individual',
      equipment: { mode: 'none' },
      timing: { pattern: 'responseWindow' },
      participationFormat: 'independent',
    },
    cueSeconds: 5,
  },
  food: {
    recommendedMovement: { baseMovement: 'quickStep', limbRule: 'free' },
    recommendedOperation: {
      startZone: 'onMat',
      participantScale: 'individual',
      equipment: { mode: 'none' },
      timing: { pattern: 'interval', workSeconds: 20, restSeconds: 10, sets: 3 },
      participationFormat: 'independent',
    },
    cueSeconds: 3,
  },
  animal: {
    recommendedMovement: { baseMovement: 'boundingStep', limbRule: 'free' },
    recommendedOperation: {
      startZone: 'adjacentToMat',
      participantScale: 'individual',
      equipment: { mode: 'none' },
      timing: { pattern: 'responseWindow' },
      participationFormat: 'independent',
    },
    cueSeconds: 4,
  },
  vehicle: {
    recommendedMovement: { baseMovement: 'plankTouch', limbRule: 'free' },
    recommendedOperation: {
      startZone: 'adjacentToMat',
      participantScale: 'individual',
      equipment: { mode: 'none' },
      timing: { pattern: 'responseWindow' },
      participationFormat: 'independent',
    },
    cueSeconds: 5,
  },
};

/** O2 Seed 대상 Preset ID (Core + Expansion) */
export const FULL_THEME_SEED_PRESET_IDS = [
  'reaction-cognition-full-color-03',
  'reaction-cognition-l3-fruit-exp',
  'reaction-cognition-full-animal-18',
  'reaction-cognition-full-nature-19',
  'reaction-cognition-l3-food-exp',
  'reaction-cognition-l3-vehicle-exp',
] as const;

export type FullThemeSeedPresetId = (typeof FULL_THEME_SEED_PRESET_IDS)[number];

const PRESET_THEME: Record<FullThemeSeedPresetId, Exclude<SpomoveColorThemeId, 'emotion'>> = {
  'reaction-cognition-full-color-03': 'color',
  'reaction-cognition-l3-fruit-exp': 'fruit',
  'reaction-cognition-full-animal-18': 'animal',
  'reaction-cognition-full-nature-19': 'nature',
  'reaction-cognition-l3-food-exp': 'food',
  'reaction-cognition-l3-vehicle-exp': 'vehicle',
};

export function applyFullThemeSeedFields(
  preset: OfficialSpomovePreset,
): OfficialSpomovePreset {
  const theme = PRESET_THEME[preset.id as FullThemeSeedPresetId];
  if (!theme) return preset;
  const seed = FULL_THEME_SEEDS[theme];
  return {
    ...preset,
    recommendedMovement: seed.recommendedMovement,
    recommendedOperation: seed.recommendedOperation,
    cueSeconds: seed.cueSeconds ?? preset.cueSeconds,
  };
}

export function applyFullThemeSeedsToLibrary(
  presets: readonly OfficialSpomovePreset[],
): OfficialSpomovePreset[] {
  return presets.map(applyFullThemeSeedFields);
}
