import { COLORS, MEMORY_ROUNDS, MODES } from '../constants';
import { GUIDE_BLOCKS } from '../trainingGuideContent';

export type TrainingSessionResult = {
  cfg: TrainingResultConfig;
  elapsedMs: number;
  colorCounts: ColorStimulusCounts | null;
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

export type TrainingResultConfig = {
  mode: string;
  level: number;
  timeMode: string;
  duration: number;
  targetReps: number;
  intervalMode?: boolean;
  intervalWork?: number;
  intervalSets?: number;
  flowDuration?: number;
};

export function describeSessionVolume(cfg: TrainingResultConfig): string {
  if (cfg.mode === 'reactTrain' && (cfg.level === 9 || cfg.level === 10)) {
    return `${cfg.targetReps}라운드`;
  }
  if (cfg.mode === 'spatial') {
    return `${MEMORY_ROUNDS}라운드`;
  }
  if (cfg.mode === 'flow') {
    const stageSec = cfg.flowDuration ?? 25;
    return `스테이지 ${stageSec}초`;
  }
  if (cfg.intervalMode) {
    const work = cfg.intervalWork ?? 30;
    const sets = cfg.intervalSets ?? 4;
    return `Tabata ${sets}세트 · ${work}초`;
  }
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

export function getTrainingEffectCopy(mode: string, level: number): { tag: string; summary: string } {
  const mo = MODES[mode];
  const levelMeta = mo?.levels.find((l) => l.id === level);
  const guide = GUIDE_BLOCKS.find((b) => b.id === mode);
  const phase = guide?.phases.find((p) => p.name === levelMeta?.name);

  return {
    tag: mo?.tag ?? guide?.tag ?? 'SPOMOVE 훈련',
    summary: phase?.goal ?? levelMeta?.desc ?? mo?.desc ?? '색·방향·기억·반응을 연결하는 신체 인지 훈련을 진행했습니다.',
  };
}

export function totalColorStimulusCount(counts: ColorStimulusCounts): number {
  return RESULT_COLOR_ORDER.reduce((sum, id) => sum + counts[id], 0);
}

export function colorMeta(id: PadColorId) {
  return COLORS.find((c) => c.id === id)!;
}

/** 카탈로그 배열 순서로 1번·2번… (엔진 id와 무관) */
export function resultLevelLabel(mode: string | undefined, level: number): string {
  if (!mode) return `${level}번`;
  const m = MODES[mode];
  const idx = m?.levels.findIndex((lv) => lv.id === level) ?? -1;
  if (idx >= 0) return `${idx + 1}번`;
  return `${level}번`;
}

export function settingsToTrainingResultConfig(cfg: {
  mode: string;
  level: number;
  timeMode: string;
  duration: number;
  targetReps: number;
  intervalMode?: boolean;
  intervalWork?: number;
  intervalSets?: number;
  flowDuration?: number;
}): TrainingResultConfig {
  return {
    mode: cfg.mode,
    level: cfg.level,
    timeMode: cfg.timeMode,
    duration: cfg.duration,
    targetReps: cfg.targetReps,
    intervalMode: cfg.intervalMode,
    intervalWork: cfg.intervalWork,
    intervalSets: cfg.intervalSets,
    flowDuration: cfg.flowDuration,
  };
}
