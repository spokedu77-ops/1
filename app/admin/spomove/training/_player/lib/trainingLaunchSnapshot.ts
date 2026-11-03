import type { MemoryGameAutoLaunch, TrainingExitResume } from '../MemoryGameApp';
import { legacyTrainingActivityFlags, resolveTrainingSelection, type TrainingActivityId } from './trainingActivity';

type SnapshotSettings = Omit<MemoryGameAutoLaunch, 'timeMode' | 'flowFeatures' | 'sportsArenaFeatures'> & {
  mode: string;
  level: number;
  activityId: TrainingActivityId;
  timeMode: string;
  flowFeatures: ReadonlySet<string>;
  sportsArenaFeatures: ReadonlySet<NonNullable<MemoryGameAutoLaunch['sportsArenaFeatures']>[number]>;
};

export function settingsToExitResume(settings: SnapshotSettings): TrainingExitResume {
  // Preserve every setting, including future additions; detach mutable collections.
  const { mode: _mode, level, ...launch } = structuredClone(settings);
  const selection = resolveTrainingSelection(settings.mode, level, { activityId: settings.activityId });
  return {
    modeId: selection.mode,
    levelId: selection.level,
    launch: {
      ...launch,
      timeMode: settings.timeMode as 'time' | 'reps',
      flowFeatures: [...settings.flowFeatures],
      sportsArenaFeatures: [...settings.sportsArenaFeatures],
      ...legacyTrainingActivityFlags(settings.activityId),
    },
  };
}
