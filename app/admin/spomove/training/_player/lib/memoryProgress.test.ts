import { describe, expect, it } from 'vitest';
import { createMemoryProgressCollector, emptyMemoryProgress, mergeMemoryProgress, validMemoryProgress } from './memoryProgress';
import { buildTrainingResultV2Model } from './trainingResultV2Model';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { RoundAnswerList } from '../components/result-v2/RoundAnswerList';

describe('actual memory presentation evidence', () => {
  it('counts committed presentations once and does not turn future patterns into progress', () => {
    const collector = createMemoryProgressCollector();
    collector.present(0, 0); collector.present(0, 0); collector.present(0, 1);
    expect(collector.snapshot()).toEqual({ ...emptyMemoryProgress(), presentedItems: 2, startedRounds: 1 });
    collector.completePresentation(0);
    collector.reveal('0', { round: 1, summary: '빨강 → 노랑', steps: ['빨강', '노랑'] });
    collector.present(1, 0);
    const record = collector.snapshot();
    expect(record).toMatchObject({ presentedItems: 3, startedRounds: 2, completedPresentations: 1, revealedAnswers: 1 });
    record.roundAnswers[0]!.steps!.push('not a real answer');
    expect(collector.snapshot().roundAnswers[0]!.steps).toEqual(['빨강', '노랑']);
    expect(createMemoryProgressCollector().snapshot()).toEqual(emptyMemoryProgress());
  });

  it('aggregates administrator exercises without double-counting the current child', () => {
    const completed = { ...emptyMemoryProgress(), presentedItems: 10, startedRounds: 1, completedPresentations: 1, revealedAnswers: 5,
      roundAnswers: Array.from({ length: 5 }, (_, i) => ({ round: i + 1, summary: `${i + 1} · 빨강` })) };
    const active = { ...emptyMemoryProgress(), presentedItems: 3, startedRounds: 1 };
    expect(mergeMemoryProgress(completed, active)).toMatchObject({ presentedItems: 13, startedRounds: 2, completedPresentations: 1, revealedAnswers: 5 });
    expect(completed.presentedItems).toBe(10);
    expect(validMemoryProgress(mergeMemoryProgress(completed, active))).toBe(true);
    expect(validMemoryProgress({ ...active, completedPresentations: 2 })).toBe(false);
  });

  it('reports memory items, completed presentations and actual answer reveals as different units', () => {
    const model = buildTrainingResultV2Model({ cfg: { mode: 'spatial', level: 4, activityId: 'color-number-memory', timeMode: 'time', duration: 0, targetReps: 10 },
      elapsedMs: 8000, colorCounts: null, completionReason: 'stopped_early',
      memoryProgress: { ...emptyMemoryProgress(), presentedItems: 4, startedRounds: 1 } });
    expect(model.metrics[1]).toMatchObject({ label: '제시 항목', value: '4개' });
    expect(model.metrics[1].note).toBe('실제 제시 항목 4개 · 제시 완료 0라운드 · 정답 공개 0문항');
    expect(model.facts).toEqual(expect.arrayContaining([
      { id: 'memory-presentations', label: '제시 완료', value: '0라운드' },
      { id: 'memory-reveals', label: '정답 공개', value: '0문항' },
    ]));
  });

  it('accepts real administrator hand-foot counters as well as the public basic route', () => {
    for (const [mode, level] of [['basic', 7], ['reactTrain', 201]] as const) {
      const model = buildTrainingResultV2Model({ cfg: { mode, level, activityId: 'hand-foot', timeMode: 'reps', duration: 0, targetReps: 5 },
        elapsedMs: 5000, colorCounts: { red: 0, yellow: 2, green: 2, blue: 1 }, stims: 5 });
      expect(model.distribution.map(item => item.count)).toEqual([0, 2, 2, 1]);
    }
  });

  it('keeps a revealed question distinct from a presentation round', () => {
    const record = [{ round: 1, summary: '3 · 초록', steps: ['3 · 초록'] }];
    expect(renderToStaticMarkup(createElement(RoundAnswerList, { record, unit: '문항' }))).toContain('1문항');
    expect(renderToStaticMarkup(createElement(RoundAnswerList, { record }))).toContain('1라운드');
  });
});
