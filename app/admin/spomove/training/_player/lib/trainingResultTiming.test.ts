import { describe, expect, it } from 'vitest';
import { settingsToTrainingResultConfig } from './trainingResultSummary';

const base = { mode: 'basic', level: 8, timeMode: 'reps', duration: 30, targetReps: 1, speed: 2 };

describe('activity-specific response time in results', () => {
  it('uses the six-second shape response time rather than unrelated two-second speed', () => {
    const result = settingsToTrainingResultConfig({ ...base, activityId: 'shape-completion', shapeCompletionResponseSeconds: 6 });
    expect(result.speed).toBe(6);
    expect(result.shapeCompletionResponseSeconds).toBe(6);
  });
  it('uses the compass response time', () => {
    expect(settingsToTrainingResultConfig({ ...base, level: 7, activityId: 'relative-compass', relativeCompassResponseSeconds: 5 }).speed).toBe(5);
  });
  it('does not invent a response time when the dedicated setting was not delivered', () => {
    expect(settingsToTrainingResultConfig({ ...base, activityId: 'shape-completion' }).speed).toBeUndefined();
  });
});
