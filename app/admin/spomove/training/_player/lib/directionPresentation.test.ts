// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { SignalDisplay } from '../components/SignalDisplay';
import { ALL_DIRECTIONS, createDirectionPresentationCollector, shouldIncludeDirectionRecord, validDirectionRecord } from './directionPresentation';
import { buildTrainingResultV2Model } from './trainingResultV2Model';
import { DirectionRecordPanel } from '../components/result-v2/DirectionRecordPanel';
import { TRAINING_ACTIVITIES, type TrainingActivityId } from './trainingActivity';
import { selectEnhancedResultEducation, selectEnhancedResultReflection } from './trainingResultEducation';

const arrow = (id: string) => ({ type: 'arrow', content: { id } });
const input = { cfg: { mode: 'basic', level: 1, activityId: 'direction-cue' as const, timeMode: 'reps', targetReps: 5, duration: 0, adminRounds: true }, elapsedMs: 5000, colorCounts: null, enhancedFeedback: true };

describe('direction presentation evidence', () => {
  it('counts response targets once, preserving two identical simultaneous Simon targets', () => {
    const collector = createDirectionPresentationCollector();
    collector.present({ type: 'flanker_arrows', content: { targetArrowId: 'left', arrows: [{ id: 'right' }, { id: 'left' }] } }, 1);
    collector.present(arrow('right'), 1);
    collector.present({ type: 'simon_arrow', content: { items: [{ arrowId: 'up' }, { arrowId: 'up' }] } }, 2);
    collector.present({ type: 'think_quad', content: { colorId: 'red' } }, 3);
    const record = collector.snapshot();
    expect(record).toMatchObject({ signals: 2, presented: 3, counts: { left: 1, up: 2, down: 0, right: 0 } });
    expect(validDirectionRecord(record)).toBe(true);
    collector.present(arrow('down'), 4);
    expect(record.counts.down).toBe(0);
    expect(createDirectionPresentationCollector().snapshot().presented).toBe(0);
  });
  it('uses only the configured directions and does not manufacture historical records', () => {
    const collector = createDirectionPresentationCollector(ALL_DIRECTIONS);
    collector.present(arrow('up-right'), 1);
    const record = collector.snapshot();
    const html = renderToStaticMarkup(React.createElement(DirectionRecordPanel, { record, supportedDirections: ALL_DIRECTIONS }));
    expect((html.match(/<strong>/g) ?? [])).toHaveLength(8);
    expect(record.directions.reduce((sum, id) => sum + record.counts[id]!, 0)).toBe(1);
    expect(buildTrainingResultV2Model(input).metrics[1].value).toBe('기록 없음');
    expect(renderToStaticMarkup(React.createElement(DirectionRecordPanel, {}))).not.toContain('0회');
    const lr = createDirectionPresentationCollector();
    lr.present({ type: 'flanker_arrows', content: { targetArrowId: 'left', flankerArrowMode: 'lr' } }, 1);
    expect(lr.snapshot().directions).toEqual(['left', 'right']);
  });
  it('uses presented screen count for progress and reports multiple targets separately', () => {
    const collector = createDirectionPresentationCollector();
    collector.present(arrow('up'), 1);
    const vm = buildTrainingResultV2Model({ ...input, stims: 2, directionRecord: collector.snapshot(), completionReason: 'stopped_early' });
    expect(vm.metrics[1].value).toBe('1 / 5회');
    expect(vm.vm.reason).toBe('stopped_early');
    collector.present({ type: 'simon_arrow', content: { items: [{ arrowId: 'left' }, { arrowId: 'right' }] } }, 2);
    const multiple = buildTrainingResultV2Model({ ...input, cfg: { ...input.cfg, mode: 'simon', level: 2, activityId: 'simon-arrow' }, directionRecord: collector.snapshot() });
    expect(multiple.metrics[1].value).toBe('2 / 5회');
    expect(multiple.facts.find(item => item.id === 'arrows')?.value).toBe('3개');
  });
  it('acknowledges only a painted cue and cancels preparation/unmounted frames under StrictMode', () => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    const frames = new Map<number, FrameRequestCallback>();
    let frameId = 0;
    const request = vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => { frames.set(++frameId, callback); return frameId; });
    const cancel = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(id => { frames.delete(id); });
    const flush = () => act(() => { const pending = [...frames.values()]; frames.clear(); pending.forEach(callback => callback(0)); });
    const host = document.createElement('div'); document.body.append(host);
    const root = createRoot(host); const shown = vi.fn();
    const render = (signal: Record<string, unknown> | null, key: number) => act(() => root.render(React.createElement(React.StrictMode, null, React.createElement(SignalDisplay, { signal, animKey: key, onPresented: shown }))));
    try {
      render(null, 0); flush(); flush(); expect(shown).not.toHaveBeenCalled();
      render(arrow('up'), 1); flush(); expect(shown).not.toHaveBeenCalled();
      flush(); expect(shown).toHaveBeenCalledTimes(1);
      render(arrow('up'), 1); flush(); flush(); expect(shown).toHaveBeenCalledTimes(1);
      render(arrow('down'), 2); act(() => root.render(null)); flush(); flush(); expect(shown).toHaveBeenCalledTimes(1);
    } finally { act(() => root.unmount()); host.remove(); request.mockRestore(); cancel.mockRestore(); }
  });
});

it('keeps V2 results independent of the retired feedback opt-in and preserves copy variants', () => {
  const color = { ...input, cfg: { ...input.cfg, activityId: 'full-screen-cue' as const, level: 3 }, colorCounts: { red: 1, yellow: 0, green: 0, blue: 0 }, stims: 1 };
  expect(buildTrainingResultV2Model(color)).toEqual(buildTrainingResultV2Model({ ...color, enhancedFeedback: undefined }));
  expect(buildTrainingResultV2Model(input)).toEqual(buildTrainingResultV2Model({ ...input, enhancedFeedback: undefined }));
  const cases = [input, { ...input, cfg: { ...input.cfg, mode: 'stroop', level: 1, activityId: 'stroop-arrow' as const, stroopArrowResponse: 'voice' as const } }, { ...input, cfg: { ...input.cfg, mode: 'spatial', level: 1, activityId: 'sequence-memory' as const } }, { ...input, cfg: { ...input.cfg, mode: 'flow', level: 1, activityId: 'action-move' as const } }];
  for (const sample of cases) {
    const descriptions = [0, 4, 8, 12].map(seed => selectEnhancedResultEducation(sample, seed));
    expect(descriptions.every(item => item.experiences.length === 3)).toBe(true);
    for (let index = 0; index < 3; index++) expect(new Set(descriptions.map(item => item.experiences[index].description)).size).toBe(4);
    const questions = [0, 64, 128, 192].map(seed => selectEnhancedResultReflection(descriptions[0], seed));
    expect(new Set(questions.map(item => item.question)).size).toBe(4);
    expect(questions.every(item => item.prompts.length === 2 && item.prompts[0] !== item.prompts[1] && !item.hint)).toBe(true);
    expect(selectEnhancedResultReflection(descriptions[0], 128)).toEqual(questions[2]);
    if (sample.cfg.mode === 'stroop') expect(JSON.stringify(questions)).not.toMatch(/발판|이동|발을|몸으로/);
  }
});

it('preserves the direction-record handoff decision for every canonical activity and extreme variant', () => {
  const recorded = new Set(['direction-cue', 'relative-compass', 'simon-arrow', 'flanker-arrow', 'stroop-arrow', 'go-no-go-action']);
  for (const id of Object.keys(TRAINING_ACTIVITIES) as TrainingActivityId[]) {
    for (const flankerExtremeMode of ['theme', 'arrow'] as const) {
      expect(shouldIncludeDirectionRecord(id, { flankerExtremeMode })).toBe(recorded.has(id) || (id === 'flanker-extreme' && flankerExtremeMode === 'arrow'));
    }
  }
});
