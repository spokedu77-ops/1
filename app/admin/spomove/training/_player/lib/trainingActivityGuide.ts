import { GUIDE_BLOCKS } from '../trainingGuideContent';
import { resolveTrainingActivity, type TrainingActivityInput } from './trainingActivity';

/** Guide associations use activity IDs; display order is never a lookup key. */
export function trainingActivityGuide(mode: string, level: number, input: TrainingActivityInput = {}) {
  const id = resolveTrainingActivity(mode, level, input);
  return GUIDE_BLOCKS.flatMap(block => block.phases).find(phase => phase.activityId === id || phase.activityIds?.includes(id));
}
