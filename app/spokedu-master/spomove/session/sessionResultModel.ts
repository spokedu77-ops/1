import type { TrainingResultConfig } from '@/app/admin/spomove/training/_player/lib/trainingResultSummary';
import { standardSpomoveDurationSec, type OfficialSpomovePreset } from '../officialSpomovePresets';
import type { MovementChangeEvent } from './sessionMovementLifecycle';
import type { MovementPick } from '../movements/movementTypes';

export type SpomoveCompletionReason =
  | 'natural_complete'
  | 'stopped_early'
  | 'cancelled'
  | 'failed';

export type SpomoveTerminalSessionState = 'done' | 'ended';

export type SpomoveCompletionPresentation = {
  title: string;
  statusBadge: string;
  description: string;
};

const SPOMOVE_COMPLETION_PRESENTATION: Record<SpomoveCompletionReason, SpomoveCompletionPresentation> = {
  natural_complete: {
    title: '훈련 완료',
    statusBadge: '정상 완료',
    description: '설정된 활동이 정상적으로 종료되었습니다.',
  },
  stopped_early: {
    title: '훈련을 중간에 종료했습니다',
    statusBadge: '중도 종료',
    description: '활동이 완료되기 전에 종료되었습니다.',
  },
  cancelled: {
    title: '훈련이 취소되었습니다',
    statusBadge: '실행 취소',
    description: '실행이 취소되어 활동을 완료하지 않았습니다.',
  },
  failed: {
    title: '훈련을 완료하지 못했습니다',
    statusBadge: '실행 오류',
    description: '실행 오류로 활동을 완료하지 못했습니다.',
  },
};

export type SpomoveMovementResult = {
  runId: string;
  initialMovement: MovementPick | null;
  finalMovement: MovementPick | null;
  movementChanges: MovementChangeEvent[];
};

export function completionReasonToSessionState(
  reason: SpomoveCompletionReason,
): SpomoveTerminalSessionState {
  return reason === 'natural_complete' ? 'done' : 'ended';
}

export function isNaturalSpomoveCompletion(reason: SpomoveCompletionReason): boolean {
  return reason === 'natural_complete';
}

export function resolveSpomoveCompletionPresentation(
  reason: SpomoveCompletionReason,
): SpomoveCompletionPresentation {
  return SPOMOVE_COMPLETION_PRESENTATION[reason];
}

export function officialPresetToTrainingResultConfig(preset: OfficialSpomovePreset): TrainingResultConfig {
  const { mode, level } = preset.engine;

  if (mode === 'reactTrain') {
    if (level === 8 || level === 9) {
      return {
        mode,
        level,
        timeMode: 'reps',
        duration: 0,
        targetReps: preset.rounds,
      };
    }
    return {
      mode,
      level,
      timeMode: 'time',
      duration: standardSpomoveDurationSec(preset.cueSeconds, preset.rounds),
      targetReps: preset.rounds,
    };
  }

  if (mode === 'flow') {
    return {
      mode,
      level,
      timeMode: 'time',
      duration: 60,
      targetReps: preset.rounds,
      flowDuration: preset.engine.flowDuration ?? 25,
    };
  }

  return {
    mode,
    level,
    timeMode: 'reps',
    duration: 0,
    targetReps: preset.rounds,
  };
}
