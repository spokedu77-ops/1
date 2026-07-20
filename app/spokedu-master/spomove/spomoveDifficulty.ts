import type { OfficialSpomovePreset } from './officialSpomovePresets';

export type SpomoveDifficultyKind = 'numberCart' | 'colorTracker' | 'mole' | 'camouflage';

export type SpomoveDifficultyOption = {
  value: string;
  label: string;
  sub: string;
};

export function getSpomoveDifficultyKind(
  preset: OfficialSpomovePreset,
): SpomoveDifficultyKind | null {
  if (preset.engine.mode !== 'reactTrain') return null;
  const level = preset.engine.level;
  if (level === 9) return 'numberCart';
  if (level === 10) return 'colorTracker';
  if (level === 7) return 'mole';
  if (level === 4) return 'camouflage';
  return null;
}

export function getSpomoveDifficultyOptions(
  kind: SpomoveDifficultyKind,
): SpomoveDifficultyOption[] {
  switch (kind) {
    case 'numberCart':
      return [
        { value: '1', label: '1', sub: '1~4' },
        { value: '2', label: '2', sub: '1~8' },
        { value: '3', label: '3', sub: '사칙연산' },
      ];
    case 'colorTracker':
      return [
        { value: '1', label: '1', sub: '입문' },
        { value: '2', label: '2', sub: '기본' },
        { value: '3', label: '3', sub: '집중' },
      ];
    case 'mole':
      return [
        { value: 'classic', label: '1', sub: '기본 · 1마리' },
        { value: 'variant', label: '2', sub: '변형 · 1·2마리' },
      ];
    case 'camouflage':
      return [
        { value: 'center', label: '1', sub: '중앙' },
        { value: 'variant', label: '2', sub: '극단 순환' },
      ];
  }
}

export function readSpomoveDifficultyValue(
  preset: OfficialSpomovePreset,
  kind: SpomoveDifficultyKind,
): string {
  switch (kind) {
    case 'numberCart':
      return String(preset.engine.numberCartTier ?? 1);
    case 'colorTracker':
      return String(preset.engine.colorTrackerTier ?? 1);
    case 'mole':
      return preset.engine.moleLookMode ?? 'classic';
    case 'camouflage':
      return preset.engine.camouflagePlacement ?? 'center';
  }
}

export function applySpomoveDifficulty(
  preset: OfficialSpomovePreset,
  kind: SpomoveDifficultyKind,
  value: string,
): OfficialSpomovePreset {
  const engine = { ...preset.engine };
  switch (kind) {
    case 'numberCart': {
      const tier = Number(value);
      engine.numberCartTier = tier === 2 || tier === 3 ? tier : 1;
      break;
    }
    case 'colorTracker': {
      const tier = Number(value);
      engine.colorTrackerTier = tier === 2 || tier === 3 ? tier : 1;
      break;
    }
    case 'mole':
      engine.moleLookMode = value === 'variant' ? 'variant' : 'classic';
      break;
    case 'camouflage':
      engine.camouflagePlacement = value === 'variant' ? 'variant' : 'center';
      break;
  }
  return { ...preset, engine };
}
