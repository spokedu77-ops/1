import type { OfficialSpomovePreset } from './officialSpomovePresets';
import { getSpomoveDifficultyKind } from './spomoveDifficulty';

export type SpomovePublicCardDifficulty = '난이도 쉬움' | '난이도 보통' | '난이도 어려움';

type PublicDifficultyGrade = 'easy' | 'normal' | 'hard';

const PUBLIC_DIFFICULTY_LABEL: Record<PublicDifficultyGrade, SpomovePublicCardDifficulty> = {
  easy: '난이도 쉬움',
  normal: '난이도 보통',
  hard: '난이도 어려움',
};

const GRADE_WORD: Record<string, PublicDifficultyGrade> = {
  쉬움: 'easy',
  보통: 'normal',
  어려움: 'hard',
};

function fromExplicitEngine(preset: OfficialSpomovePreset): PublicDifficultyGrade | null {
  const engine = preset.engine;
  if (engine.handFootDifficulty === 'easy' || engine.handFootDifficulty === 'normal' || engine.handFootDifficulty === 'hard') {
    return engine.handFootDifficulty;
  }
  if (engine.goalkeeperTier === 1) return 'easy';
  if (engine.goalkeeperTier === 2) return 'normal';
  if (engine.moleLookMode === 'classic') return 'easy';
  if (engine.moleLookMode === 'variant') return 'normal';
  if (engine.simonPoleCount === 2) return 'hard';
  if (engine.simonPoleCount === 1) return 'normal';
  if (engine.camouflagePlacement === 'center') return 'normal';
  if (engine.camouflagePlacement === 'variant') return 'hard';
  if (engine.bodyLabelMode === 'easy') return 'easy';
  if (engine.bodyLabelMode === 'hard') return 'hard';
  if (engine.colorTrackerDualPanel) return 'hard';
  if (engine.colorTrackerTier) return 'normal';
  if (engine.flankerArrowMode === 'udlr') return 'hard';
  if (engine.flankerArrowMode === 'lr') return 'normal';
  if (engine.flankerExtremeMode === 'arrow') return 'hard';
  return null;
}

function fromDifficultyKind(preset: OfficialSpomovePreset): PublicDifficultyGrade | null {
  const kind = getSpomoveDifficultyKind(preset);
  if (kind === 'mole') return preset.engine.moleLookMode === 'variant' ? 'normal' : 'easy';
  if (kind === 'goalkeeper') return preset.engine.goalkeeperTier === 1 ? 'easy' : 'normal';
  if (kind === 'simonPole') return preset.engine.simonPoleCount === 2 ? 'hard' : 'normal';
  if (kind === 'colorTracker') return preset.engine.colorTrackerDualPanel ? 'hard' : 'normal';
  return null;
}

function parseExactDifficultyWord(value: string): PublicDifficultyGrade | null {
  return GRADE_WORD[value.trim()] ?? null;
}

function fromExecutionFact(preset: OfficialSpomovePreset): PublicDifficultyGrade | null {
  const fact = preset.executionFacts.find((item) => item.label === '난이도')?.value.trim();
  if (!fact) return null;
  return parseExactDifficultyWord(fact);
}

function fromTitle(preset: OfficialSpomovePreset): PublicDifficultyGrade | null {
  const match = preset.title.match(/(쉬움|보통|어려움)/u);
  if (!match?.[1]) return null;
  return GRADE_WORD[match[1]] ?? null;
}

function fromSettingChips(preset: OfficialSpomovePreset): PublicDifficultyGrade | null {
  for (const chip of preset.settingChips) {
    const grade = parseExactDifficultyWord(chip);
    if (grade) return grade;
  }
  return null;
}

function fromProgramContract(preset: OfficialSpomovePreset): PublicDifficultyGrade | null {
  const engine = preset.engine;
  if (engine.mode === 'simon') return 'normal';
  if (engine.spatialArrowColorMode === 'color') return 'normal';
  if (engine.mode === 'basic' && engine.level <= 4) return 'easy';
  if (engine.mode === 'flanker') return 'normal';
  if (engine.mode === 'reactTrain') return 'easy';
  if (engine.mode === 'flow') {
    return engine.flowFeatures?.includes('colorGate') ? 'hard' : 'easy';
  }
  if (engine.mode === 'spatial') return 'normal';
  if (engine.mode === 'stroop') return 'hard';
  return null;
}

export function resolveSpomovePublicCardDifficulty(preset: OfficialSpomovePreset): SpomovePublicCardDifficulty {
  const grade =
    fromExplicitEngine(preset) ??
    fromDifficultyKind(preset) ??
    fromExecutionFact(preset) ??
    fromProgramContract(preset) ??
    fromSettingChips(preset) ??
    fromTitle(preset) ??
    'normal';
  return PUBLIC_DIFFICULTY_LABEL[grade];
}
