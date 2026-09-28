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
