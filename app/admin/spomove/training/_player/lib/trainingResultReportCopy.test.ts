import { describe, expect, it } from 'vitest';
import { TRAINING_ACTIVITIES } from './trainingActivity';
import { selectV2ResultCopy } from './trainingResultEducation';
import type { TrainingResultViewInput } from './trainingResultViewModel';

describe('activity-specific V2 report copy', () => {
  it('uses stable, bounded complete sentences for every activity and copy combination', () => {
    for (const [activityId, definition] of Object.entries(TRAINING_ACTIVITIES)) {
      const route = definition.routes[0]!;
      const input: TrainingResultViewInput = { cfg: { mode: route.mode, level: route.levels[0]!, activityId: activityId as keyof typeof TRAINING_ACTIVITIES, timeMode: 'reps', targetReps: 5, duration: 0 }, elapsedMs: 5000, colorCounts: null };
      for (const questionSeed of [0, 64, 128, 192]) for (const experienceSeed of [0, 4, 8, 12]) {
        const seed = questionSeed + experienceSeed;
        const copy = selectV2ResultCopy(input, seed);
        expect(copy).toEqual(selectV2ResultCopy(input, seed));
        expect(copy.education.experiences).toHaveLength(3);
        for (const experience of copy.education.experiences) expect(experience.description.length).toBeLessThanOrEqual(90);
        for (const sentence of [copy.question, copy.extra, copy.movement]) {
          expect(sentence.length).toBeLessThanOrEqual(72);
          expect(sentence).toMatch(/\?$/);
          expect(sentence).not.toContain('…');
        }
      }
    }
  });
  it('varies new result seeds while keeping voice and movement rules separate', () => {
    const input: TrainingResultViewInput = { cfg: {mode:'stroop',level:1,activityId:'stroop-arrow',stroopArrowResponse:'voice',timeMode:'reps',targetReps:5,duration:0},elapsedMs:5000,colorCounts:null };
    expect(new Set([0,64,128,192].map(seed=>selectV2ResultCopy(input,seed).movement)).size).toBe(4);
    expect(selectV2ResultCopy(input,0).movement).toContain('말로');
    expect(selectV2ResultCopy(input,0).movement).not.toMatch(/발판|몸으로|이동/);
  });
});
