import { resolveTrainingSelection, type TrainingActivityId } from './trainingActivity';
import type { TrainingResultConfig } from './trainingResultSummary';

export type TrainingResultKind = 'color' | 'direction' | 'zone' | 'number' | 'sequence' | 'instant' | 'teacher' | 'time';

/** Exhaustive activity identity map. Catalog titles and publication state never choose a report. */
export const TRAINING_RESULT_KINDS = {
  'direction-cue': 'direction', 'quadrant-cue': 'color', 'full-screen-cue': 'color', 'two-panel-cue': 'color',
  'three-panel-cue': 'color', 'random-panel-cue': 'color', 'relative-compass': 'direction', 'shape-completion': 'zone',
  'hand-foot': 'color', 'wave-dodge': 'color', 'falling-bricks': 'color', 'balloon-pop': 'color',
  mole: 'color', 'number-cart': 'zone', 'color-tracker': 'zone',
  goalkeeper: 'zone', 'virus-outbreak': 'color', 'moving-number-reader': 'number', 'target-tracking': 'zone',
  'simon-shape': 'color', 'simon-arrow': 'direction', 'simon-theme': 'color', 'simon-camouflage': 'color', 'simon-balloon': 'color',
  'visual-search': 'zone', 'flanker-arrow': 'direction', 'flanker-theme': 'color', 'flanker-extreme': 'color', 'flanker-nested': 'color',
  'stroop-arrow': 'direction', 'stroop-word': 'color', 'stroop-word-advanced': 'color', 'stroop-background-word': 'color',
  'sequence-memory': 'sequence', 'color-number-memory': 'sequence', 'color-number-quiz': 'sequence',
  'glass-bridge-memory': 'teacher', 'instant-memory': 'instant', 'action-move': 'time', 'motion-gate': 'color',
} as const satisfies Record<TrainingActivityId, TrainingResultKind>;

export function resolveTrainingResultKind(cfg: TrainingResultConfig): TrainingResultKind {
  const id = resolveTrainingSelection(cfg.mode, cfg.level, { activityId: cfg.activityId }).activityId;
  if (id === 'flanker-extreme' && cfg.flankerExtremeMode === 'arrow') return 'direction';
  return TRAINING_RESULT_KINDS[id];
}
