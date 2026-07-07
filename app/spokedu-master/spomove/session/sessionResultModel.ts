import type { TrainingResultConfig } from '@/app/admin/spomove/training/_player/lib/trainingResultSummary';
import { standardSpomoveDurationSec, type OfficialSpomovePreset } from '../officialSpomovePresets';

export function officialPresetToTrainingResultConfig(preset: OfficialSpomovePreset): TrainingResultConfig {
  const { mode, level } = preset.engine;

  if (mode === 'reactTrain') {
    if (level === 9 || level === 10) {
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
