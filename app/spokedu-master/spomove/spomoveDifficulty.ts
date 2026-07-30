import type { OfficialSpomovePreset } from './officialSpomovePresets';

export type SpomoveDifficultyKind =
  | 'numberCart'
  | 'colorTracker'
  | 'mole'
  | 'goalkeeper'
  | 'simonPole';

export type SpomoveDifficultyOption = {
  value: string;
  label: string;
  sub: string;
};

/** 흰 공 찾기 통합 3단계 → engine tier+dual 매핑 */
export function colorTrackerStageToEngine(stage: 1 | 2 | 3): {
  colorTrackerTier: 1 | 3;
  colorTrackerDualPanel: boolean;
} {
  if (stage === 3) return { colorTrackerTier: 3, colorTrackerDualPanel: true };
  if (stage === 2) return { colorTrackerTier: 3, colorTrackerDualPanel: false };
  return { colorTrackerTier: 1, colorTrackerDualPanel: false };
}

export function colorTrackerEngineToStage(
  tier: number | undefined,
  dualPanel: boolean | undefined,
): 1 | 2 | 3 {
  if (dualPanel) return 3;
  if (tier === 3 || tier === 2) return 2;
  return 1;
}

export function getSpomoveDifficultyKind(
  preset: OfficialSpomovePreset,
): SpomoveDifficultyKind | null {
  if (preset.engine.mode === 'simon' && (preset.engine.level === 1 || preset.engine.level === 2)) {
    return 'simonPole';
  }
  if (preset.engine.mode !== 'reactTrain') return null;
  const level = preset.engine.level;
  if (level === 8) return 'numberCart';
  if (level === 9) return 'colorTracker';
  if (level === 6) return 'mole';
  if (level === 10) return 'goalkeeper';
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
        { value: '1', label: '1', sub: '입문 · 단일' },
        { value: '2', label: '2', sub: '집중 · 단일' },
        { value: '3', label: '3', sub: '집중 · 2패널' },
      ];
    case 'mole':
      return [
        { value: 'classic', label: '1', sub: '기본 · 1마리' },
        { value: 'variant', label: '2', sub: '변형 · 1·2마리' },
      ];
    case 'goalkeeper':
      return [
        { value: '1', label: '1', sub: '항상 1개' },
        { value: '2', label: '2', sub: '1~2개' },
      ];
    case 'simonPole':
      return [
        { value: '1', label: '기본', sub: '1개' },
        { value: '2', label: '응용', sub: '2개' },
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
      return String(
        colorTrackerEngineToStage(
          preset.engine.colorTrackerTier,
          preset.engine.colorTrackerDualPanel,
        ),
      );
    case 'mole':
      return preset.engine.moleLookMode ?? 'classic';
    case 'goalkeeper':
      return String(preset.engine.goalkeeperTier ?? 2);
    case 'simonPole':
      return String(preset.engine.simonPoleCount ?? 1);
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
      const stage = value === '2' ? 2 : value === '3' ? 3 : 1;
      const mapped = colorTrackerStageToEngine(stage);
      engine.colorTrackerTier = mapped.colorTrackerTier;
      engine.colorTrackerDualPanel = mapped.colorTrackerDualPanel;
      break;
    }
    case 'mole':
      engine.moleLookMode = value === 'variant' ? 'variant' : 'classic';
      break;
    case 'goalkeeper':
      engine.goalkeeperTier = value === '1' ? 1 : 2;
      break;
    case 'simonPole':
      engine.simonPoleCount = value === '2' ? 2 : 1;
      break;
  }
  return { ...preset, engine };
}
