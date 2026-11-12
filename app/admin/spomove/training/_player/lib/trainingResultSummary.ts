import type { GlassBridgeResult } from './glassBridgeMemory';
import { resolveTrainingSelection, type TrainingActivityId } from './trainingActivity';
import { trainingActivityGuide } from './trainingActivityGuide';
import { COLORS, MEMORY_ROUNDS, MODES } from '../constants';
import type { SpomoveCompletionReason } from '@/app/spokedu-master/spomove/session/sessionResultModel';
import type { DirectionPresentationRecord } from './directionPresentation';

export function resolveTrainingCompletionReason(result: {
  completionReason?: SpomoveCompletionReason;
  stoppedEarly?: boolean;
}): SpomoveCompletionReason {
  return result.completionReason ?? (result.stoppedEarly ? 'stopped_early' : 'natural_complete');
}

export type TrainingSessionResult = {
  cfg: TrainingResultConfig;
  elapsedMs: number;
  colorCounts: ColorStimulusCounts | null;
  stoppedEarly?: boolean;
  completionReason?: SpomoveCompletionReason;
  stims?: number;
  directionRecord?: DirectionPresentationRecord;
  shapeCompletionRecord?: import('@/app/admin/spomove/training/_player/lib/shapeCompletionRecord').ShapeCompletionRecord;
  roundAnswers?: import('@/app/admin/spomove/training/_player/lib/roundAnswerRecord').RoundAnswerRecord;
  moleRecord?: import('@/app/admin/spomove/training/_player/lib/moleResultRecord').MoleResultRecord;
  goalkeeperRecord?: import('./goalkeeperResultRecord').GoalkeeperResultRecord;
  glassBridge?: GlassBridgeResult;
};

export type PadColorId = 'red' | 'blue' | 'green' | 'yellow';
export type ColorStimulusCounts = Record<PadColorId, number>;

/** 화면 표시 순: 빨 → 노 → 초 → 파 */
export const RESULT_COLOR_ORDER: PadColorId[] = ['red', 'yellow', 'green', 'blue'];

export function emptyColorStimulusCounts(): ColorStimulusCounts {
  return { red: 0, yellow: 0, green: 0, blue: 0 };
}

/** reactTrain laneCount: 빨 → 파 → 초 → 노 */
export function laneCountToColorStimulusCounts(
  laneCount: [number, number, number, number],
): ColorStimulusCounts {
  return {
    red: laneCount[0] ?? 0,
    blue: laneCount[1] ?? 0,
    green: laneCount[2] ?? 0,
    yellow: laneCount[3] ?? 0,
  };
}

export function addColorIdsToCounts(counts: ColorStimulusCounts, colorIds: string[]): ColorStimulusCounts {
  const next = { ...counts };
  for (const id of colorIds) {
    if (id === 'red' || id === 'blue' || id === 'green' || id === 'yellow') {
      next[id]++;
    }
  }
  return next;
}

/** Execution rules needed to describe the activity accurately on Result. */
export type TrainingResultRuleSettings = {
  shapeCompletionResponseSeconds?: number;
  relativeCompassResponseSeconds?: number;
  colorMemoryGridSize?: 3 | 4 | 5;
  colorMemoryGridMode?: 'flicker' | 'oneshot';
  glassBridgeDifficulty?: 'easy' | 'hard';
  goalkeeperTier?: 1 | 2;
  variantColorTheme?: string;
  accel?: boolean;
  spatialArrowColorMode?: 'basic' | 'color';
  flankerStimulusType?: 'color' | 'number';
  stroopArrowResponse?: 'voice' | 'movement';
  stroopWordResponse?: 'voice' | 'movement';
  stroopWordRuleMode?: 'switch' | 'reverse';
  stroopWordMode?: 'bg' | 'missing';
  stroopWordDifficulty?: 'basic' | 'bg';
};

export type TrainingResultConfig = TrainingResultRuleSettings & {
  mode: string;
  level: number;
  activityId?: TrainingActivityId;
  flankerExtremeMode?: 'theme' | 'arrow';
  speed?: number;
  visualSearchStage?: 1 | 2;
  visualSearchTargetCount?: 1 | 2;
  adminRounds?: boolean;
  adminSequenceTiming?: boolean;
  glassBridgeStartLength?: 3 | 4 | 5 | 6;
  timeMode: string;
  duration: number;
  targetReps: number;
  intervalMode?: boolean;
  intervalWork?: number;
  intervalSets?: number;
  flowDuration?: number;
};

export function describeSessionVolume(cfg: TrainingResultConfig): string {
  if (cfg.adminRounds && cfg.timeMode === 'reps') return `${cfg.targetReps}라운드`;
  if (cfg.activityId === 'glass-bridge-memory' || (cfg.mode === 'spatial' && cfg.level === 8)) return `${cfg.targetReps}라운드`;
  if (cfg.activityId === 'moving-number-reader' || (cfg.mode === 'reactTrain' && cfg.level === 15)) return `${cfg.targetReps}회`;
  if (cfg.mode === 'reactTrain' && (cfg.level === 8 || cfg.level === 9)) {
    return `${cfg.targetReps}라운드`;
  }
  if (cfg.mode === 'spatial') {
    return `${MEMORY_ROUNDS}라운드`;
  }
  if (cfg.mode === 'flow') {
    if (cfg.timeMode === 'reps') return `${cfg.targetReps}회`;
    const stageSec = cfg.flowDuration ?? 25;
    return `스테이지 ${stageSec}초`;
  }
  if (cfg.intervalMode) {
    const work = cfg.intervalWork ?? 30;
    const sets = cfg.intervalSets ?? 4;
    return `Tabata ${sets}세트 · ${work}초`;
  }
  if (cfg.timeMode === 'reps') return `${cfg.targetReps}회`;
  if (cfg.mode === 'reactTrain' || cfg.timeMode === 'time') {
    return `${cfg.duration}초`;
  }
  return `${cfg.targetReps}회`;
}

export function formatElapsedSeconds(elapsedMs: number): string {
  if (elapsedMs <= 0) return '-';
  const sec = Math.max(1, Math.round(elapsedMs / 1000));
  if (sec < 60) return `${sec}초`;
  const min = Math.floor(sec / 60);
  const rem = sec % 60;
  return rem > 0 ? `${min}분 ${rem}초` : `${min}분`;
}

export function getTrainingEffectCopy(mode: string, level: number, activityId?: TrainingActivityId): { tag: string; summary: string } {
  const selection = resolveTrainingSelection(mode, level, { activityId });
  const mo = MODES[selection.catalogMode ?? selection.mode];
  const phase = trainingActivityGuide(mode, level, { activityId });
  const levelMeta = mo?.levels.find(item => item.id === selection.catalogLevel);
  return { tag: mo?.tag ?? 'SPOMOVE', summary: phase?.goal ?? levelMeta?.desc ?? selection.title };
}

export function totalColorStimulusCount(counts: ColorStimulusCounts): number {
  return RESULT_COLOR_ORDER.reduce((sum, id) => sum + counts[id], 0);
}

export function colorMeta(id: PadColorId) {
  return COLORS.find((c) => c.id === id)!;
}

/** 카탈로그 배열 순서로 1번·2번… (엔진 id와 무관) */
export function resultLevelLabel(mode: string | undefined, level: number, activityId?: TrainingActivityId): string {
  if (!mode) return '';
  const selection = resolveTrainingSelection(mode, level, { activityId });
  return selection.number ? `${selection.number}\uBC88` : selection.title;
}

export function settingsToTrainingResultConfig(cfg: TrainingResultRuleSettings & {
  mode: string;
  level: number;
  activityId?: TrainingActivityId;
  flankerExtremeMode?: 'theme' | 'arrow';
  speed?: number;
  visualSearchStage?: 1 | 2;
  visualSearchTargetCount?: 1 | 2;
  adminRounds?: boolean;
  adminSequenceTiming?: boolean;
  glassBridgeStartLength?: 3 | 4 | 5 | 6;
  timeMode: string;
  duration: number;
  targetReps: number;
  intervalMode?: boolean;
  intervalWork?: number;
  intervalSets?: number;
  flowDuration?: number;
}): TrainingResultConfig {
  return {
    colorMemoryGridSize: cfg.colorMemoryGridSize,
    colorMemoryGridMode: cfg.colorMemoryGridMode,
    glassBridgeDifficulty: cfg.glassBridgeDifficulty,
    goalkeeperTier: cfg.goalkeeperTier,
    variantColorTheme: cfg.variantColorTheme,
    accel: cfg.accel,
    mode: cfg.mode,
    level: cfg.level,
    activityId: cfg.activityId,
    flankerExtremeMode: cfg.flankerExtremeMode,
    spatialArrowColorMode: cfg.spatialArrowColorMode,
    flankerStimulusType: cfg.flankerStimulusType,
    stroopArrowResponse: cfg.stroopArrowResponse,
    stroopWordResponse: cfg.stroopWordResponse,
    stroopWordRuleMode: cfg.stroopWordRuleMode,
    stroopWordMode: cfg.stroopWordMode,
    stroopWordDifficulty: cfg.stroopWordDifficulty,
    shapeCompletionResponseSeconds: cfg.shapeCompletionResponseSeconds,
    relativeCompassResponseSeconds: cfg.relativeCompassResponseSeconds,
    speed: cfg.activityId === 'shape-completion' ? cfg.shapeCompletionResponseSeconds
      : cfg.activityId === 'relative-compass' ? cfg.relativeCompassResponseSeconds : cfg.speed,
    visualSearchStage: cfg.visualSearchStage,
    visualSearchTargetCount: cfg.visualSearchTargetCount,
    adminRounds: cfg.adminRounds,
    adminSequenceTiming: cfg.adminSequenceTiming,
    glassBridgeStartLength: cfg.glassBridgeStartLength,
    timeMode: cfg.timeMode,
    duration: cfg.duration,
    targetReps: cfg.targetReps,
    intervalMode: cfg.intervalMode,
    intervalWork: cfg.intervalWork,
    intervalSets: cfg.intervalSets,
    flowDuration: cfg.flowDuration,
  };
}
