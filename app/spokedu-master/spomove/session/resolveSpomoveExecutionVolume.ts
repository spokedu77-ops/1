import { COLOR_SEQUENCE_RAMP_ROUNDS, MEMORY_ROUNDS } from '@/app/admin/spomove/training/_player/constants';
import { SELECTABLE_MODULE_KEYS, type FlowModuleKey } from '@/app/admin/spomove/training/_player/flow-lab/engine/modules/flowModules';
import { buildStages } from '@/app/admin/spomove/training/_player/flow-lab/engine/modules/stageBuilder';
import {
  LEVEL4_QA_COUNT,
  LEVEL4_TOTAL,
} from '@/app/admin/spomove/training/_player/lib/resolveColorNumberMemoryMoveTarget';
import { diveActionMoveDurationSec } from '@/app/lib/spomove/diveActionMoveTiming';
import { isDiveActionMoveUnityTheme, type DiveThemeId } from '@/app/lib/spomove/diveThemes';
import {
  standardSpomoveDurationSec,
  type OfficialSpomovePreset,
} from '../officialSpomovePresets';

/**
 * Display SSOT for how a SPOMOVE session ends.
 * Mirrors EngineRouter stop conditions. Does not start, time, or configure the engine.
 */
export type SpomoveExecutionVolumeKind =
  | 'reps'
  | 'time'
  | 'rounds'
  | 'stage'
  | 'interval'
  | 'builtIn';

export type SpomoveExecutionInterval = {
  workSeconds: number;
  restSeconds: number;
  sets: number;
};

export type SpomoveExecutionVolume = {
  kind: SpomoveExecutionVolumeKind;
  label: string;
  count: number;
  durationSec: number;
  interval: SpomoveExecutionInterval | null;
};

export type ResolveSpomoveExecutionVolumeInput = {
  preset: OfficialSpomovePreset;
  cueSeconds: number;
  /**
   * Effective operation interval. Applied only on the MemoryGameApp path
   * (basic, flanker, stroop, simon except L4/L5), matching EngineRouter.
   */
  interval?: SpomoveExecutionInterval | null;
  diveEnvironmentTheme?: DiveThemeId | null;
  /** Seconds EngineRouter receives as flowDuration. */
  flowDurationSec?: number | null;
  /** Bonus flag EngineRouter receives. */
  flowIncludeBonus?: boolean | null;
  sportsArenaFeatures?: Array<'side' | 'jump' | 'duck'> | null;
};

function repsVolume(count: number): SpomoveExecutionVolume {
  const n = Math.max(1, Math.round(count));
  return { kind: 'reps', label: `${n}회`, count: n, durationSec: 0, interval: null };
}

function timeVolume(seconds: number): SpomoveExecutionVolume {
  const n = Math.max(1, Math.round(seconds));
  return { kind: 'time', label: `${n}초`, count: 0, durationSec: n, interval: null };
}

function roundsVolume(count: number): SpomoveExecutionVolume {
  const n = Math.max(1, Math.round(count));
  return { kind: 'rounds', label: `${n}라운드`, count: n, durationSec: 0, interval: null };
}

/** Same snap as NumberCartReactionTraining.normalizeNumberCartRounds. */
const NUMBER_CART_ROUND_OPTIONS = [7, 10, 15, 25] as const;
/** Same snap as ColorTrackerReactionTraining.normalizeColorTrackerRounds. */
const COLOR_TRACKER_ROUND_OPTIONS = [2, 3, 5, 10] as const;

function snapRoundOption(value: number, options: readonly number[], fallback: number): number {
  const n = Math.round(Number.isFinite(value) ? value : fallback);
  if (options.includes(n)) return n;
  return options.reduce((best, option) => (Math.abs(option - n) < Math.abs(best - n) ? option : best));
}

function goalkeeperVolume(includeBonus: boolean): SpomoveExecutionVolume {
  const bonusSeconds = includeBonus ? 15 : 0;
  return {
    kind: 'time',
    label: includeBonus ? '60초 + 보너스 15초' : '60초',
    count: 0,
    durationSec: 60 + bonusSeconds,
    interval: null,
  };
}

function memoryGameIntervalApplies(
  mode: OfficialSpomovePreset['engine']['mode'],
  level: number,
  interval: SpomoveExecutionInterval | null | undefined,
): interval is SpomoveExecutionInterval {
  if (!interval) return false;
  if (mode === 'simon' && (level === 4 || level === 5)) return false;
  return mode === 'basic' || mode === 'simon' || mode === 'flanker' || mode === 'stroop';
}

function flowStageVolume(
  preset: OfficialSpomovePreset,
  input: ResolveSpomoveExecutionVolumeInput,
): SpomoveExecutionVolume {
  const theme = input.diveEnvironmentTheme ?? 'space';
  const stageSec = input.flowDurationSec ?? preset.engine.flowDuration ?? 25;
  const includeBonus = input.flowIncludeBonus ?? preset.engine.flowIncludeBonus ?? true;
  const features = [...(preset.engine.flowFeatures ?? [])];
  if (preset.engine.level === 2 && !features.includes('colorGate')) features.push('colorGate');

  if (preset.engine.level === 1 && isDiveActionMoveUnityTheme(theme)) {
    const sports = new Set(input.sportsArenaFeatures ?? []);
    const total = diveActionMoveDurationSec(
      {
        side: sports.has('side'),
        jump: sports.has('jump'),
        duck: sports.has('duck'),
        bonus: includeBonus,
      },
      stageSec,
    );
    return timeVolume(Math.max(1, total));
  }

  const selected = new Set<FlowModuleKey>(features);
  const modules: FlowModuleKey[] = [
    ...SELECTABLE_MODULE_KEYS.filter((key) => selected.has(key)),
    ...(selected.has('colorGate') ? (['colorGate'] as const) : []),
  ];
  const stages = buildStages(modules, stageSec, {
    layout: preset.engine.flowLayout ?? 'sequential',
    includeBonus,
  });
  const total = stages.reduce((sum, stage) => sum + stage.durationSec, 0);
  if (stages.length === 1 && !stages[0]?.isBonus) {
    const seconds = stages[0]?.durationSec ?? stageSec;
    return {
      kind: 'stage',
      label: `1스테이지 ${seconds}초`,
      count: 1,
      durationSec: seconds,
      interval: null,
    };
  }
  const regular = stages.filter((stage) => !stage.isBonus);
  const per = regular[0]?.durationSec ?? stageSec;
  const bonus = stages.find((stage) => stage.isBonus);
  const sameRegular = regular.length > 0 && regular.every((stage) => stage.durationSec === per);
  const label = sameRegular
    ? bonus
      ? `${regular.length}스테이지 · 스테이지당 ${per}초 · 보너스 ${bonus.durationSec}초 · 운동 ${total}초`
      : `${regular.length}스테이지 · 스테이지당 ${per}초 · 총 ${total}초`
    : `${stages.length}스테이지 · 총 ${total}초`;
  return {
    kind: 'stage',
    label,
    count: stages.length,
    durationSec: total,
    interval: null,
  };
}

export function resolveSpomoveExecutionVolume(
  input: ResolveSpomoveExecutionVolumeInput,
): SpomoveExecutionVolume {
  const { preset, cueSeconds } = input;
  const { mode, level } = preset.engine;
  const rounds = preset.rounds;

  if (memoryGameIntervalApplies(mode, level, input.interval)) {
    const interval = input.interval;
    return {
      kind: 'interval',
      label: `${interval.sets}세트 · 운동 ${interval.workSeconds}초 · 휴식 ${interval.restSeconds}초`,
      count: interval.sets,
      durationSec: 0,
      interval,
    };
  }

  if (mode === 'simon' && level === 4) {
    return timeVolume(standardSpomoveDurationSec(cueSeconds, rounds));
  }

  if (mode === 'basic' || mode === 'simon' || mode === 'flanker' || mode === 'stroop') {
    return repsVolume(rounds);
  }

  if (mode === 'reactTrain') {
    if (level === 1 || level === 2) return repsVolume(rounds);
    if (level === 6 || level === 10) return { ...repsVolume(rounds), label: `${rounds}회 + 보너스 15초`, durationSec: 15 };
    if (level === 8) return roundsVolume(snapRoundOption(rounds, NUMBER_CART_ROUND_OPTIONS, 5));
    if (level === 9) return roundsVolume(snapRoundOption(rounds, COLOR_TRACKER_ROUND_OPTIONS, 5));
    return timeVolume(standardSpomoveDurationSec(cueSeconds, rounds));
  }

  if (mode === 'spatial') {
    if (level === 7) {
      return roundsVolume(rounds);
    }
    if (level === 4) {
      return {
        kind: 'builtIn',
        label: `색·번호 ${LEVEL4_TOTAL}개 + 퀴즈 ${LEVEL4_QA_COUNT}문항`,
        count: LEVEL4_TOTAL,
        durationSec: 0,
        interval: null,
      };
    }
    if (level === 3) return roundsVolume(COLOR_SEQUENCE_RAMP_ROUNDS);
    return roundsVolume(MEMORY_ROUNDS);
  }

  if (preset.id === 'dive-color-gate-61') return repsVolume(20);

  if (mode === 'flow') return flowStageVolume(preset, input);

  return repsVolume(rounds);
}
