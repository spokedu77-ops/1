import { describe, expect, it } from 'vitest';
import { TRAINING_GROUPS, TRAINING_PROGRAMS, visibleTrainingPrograms } from './trainingCatalog';

describe('admin catalog presentation groups', () => {
  it('keeps all eight existing entry IDs and filters DIVE and sports with their group', () => {
    expect(visibleTrainingPrograms('ALL').map(p => p.id)).toEqual(['basic', 'reactTrain', 'simon', 'flanker', 'stroop', 'spatial', 'flow', 'sports']);
    expect(visibleTrainingPrograms('response').map(p => p.id)).toEqual(['basic', 'reactTrain']);
    expect(visibleTrainingPrograms('attention').map(p => p.id)).toEqual(['simon', 'flanker']);
    expect(visibleTrainingPrograms('executive').map(p => p.id)).toEqual(['stroop', 'spatial']);
    expect(visibleTrainingPrograms('advanced').map(p => p.id)).toEqual(['flow', 'sports']);
    expect(new Set(TRAINING_PROGRAMS.map(p => p.id)).size).toBe(8);
    const entered: string[] = [];
    TRAINING_PROGRAMS.forEach(program => program.enter(id => entered.push(id)));
    expect(entered).toEqual(TRAINING_PROGRAMS.map(p => p.id));
  });
  it('uses the approved four color meanings', () => {
    expect(Object.values(TRAINING_GROUPS).map(g => g.color)).toEqual(['#F87171', '#FBBF24', '#34D399', '#60A5FA']);
  });
});
