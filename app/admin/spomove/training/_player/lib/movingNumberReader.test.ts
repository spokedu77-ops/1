// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MovingNumberReaderTraining } from '../components/MovingNumberReaderTraining';
import { createNumberReaderTrial, numberReaderFlightSeconds, numberReaderPhaseSeconds,
  numberReaderOccluders, numberReaderPosition, numberReaderRadius, NUMBER_READER_ZONES,
  type NumberReaderPhase } from './movingNumberReader';
import { drawNumberReaderFrame } from './movingNumberReaderCanvas';
import { catalogTrainingActivity } from './trainingActivity';
import { emptyColorStimulusCounts } from './trainingResultSummary';
import { resolveTrainingResultRichContent } from './trainingResultRichContent';

const clock = vi.hoisted(() => ({ now: 0, next: 0, frames: new Map<number, FrameRequestCallback>() }));
vi.mock('./reactTrainStartCountdown', async original => ({
  ...await original<typeof import('./reactTrainStartCountdown')>(),
  runReactTrainStartCountdown: ({ onTick, onDone }: { onTick: (n: number) => void; onDone: () => void }) => {
    onTick(0); onDone(); return () => {};
  },
}));
vi.mock('./runtimeClock', () => ({
  spomovePerformance: { now: () => clock.now },
  spomoveRequestAnimationFrame: (callback: FrameRequestCallback) => { const id = ++clock.next; clock.frames.set(id, callback); return id; },
  spomoveCancelAnimationFrame: (id: number) => clock.frames.delete(id),
}));
let host: HTMLDivElement, root: Root;
function step(ms: number) {
  act(() => { clock.now += ms; const callbacks = [...clock.frames.values()]; clock.frames.clear(); callbacks.forEach(callback => callback(clock.now)); });
}
function phase() { return host.querySelector('canvas')?.dataset.phase; }
function reach(target: NumberReaderPhase, round: number) {
  for (let i = 0; i < 1200; i++) {
    const canvas = host.querySelector('canvas');
    if (canvas?.dataset.phase === target && Number(canvas.dataset.round) === round) return;
    step(10);
  }
  throw new Error(`Did not reach ${round}:${target}`);
}
beforeEach(() => {
  clock.now = 0; clock.frames.clear();
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  vi.spyOn(Math, 'random').mockReturnValue(.02);
  vi.spyOn(HTMLCanvasElement.prototype, 'getBoundingClientRect').mockReturnValue({ width: 1000, height: 600 } as DOMRect);
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(new Proxy({}, { get: () => () => {} }) as never);
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
});
afterEach(() => { act(() => root.unmount()); host.remove(); vi.restoreAllMocks(); });

describe('renewed slot 11 source progression', () => {
  it.each([1, 3, 6, 10])('keeps easy flights fixed at %s seconds with a three-second action phase', seconds => {
    for (const round of [1, 3, 5, 9, 20]) {
      expect(numberReaderPhaseSeconds('FLY', seconds, round, false)).toBe(seconds);
      expect(numberReaderPhaseSeconds('ACTION', seconds, round, false)).toBe(3);
    }
  });
  it('defaults legacy callers to easy without converting their selected speed', () => {
    act(() => root.render(React.createElement(MovingNumberReaderTraining, { targetReps: 5, flightSeconds: 6, onComplete: () => {}, onProgress: () => {} })));
    reach('FLY', 1);
    expect(host.querySelector('canvas')?.dataset.difficulty).toBe('easy');
    expect(host.querySelector('canvas')?.dataset.flightSeconds).toBe('6.00');
    step(1200); expect(phase()).toBe('FLY');
  });
  it.each([1, 3, 5, 9, 10, 20])('matches the source timing formulas at round %s', round => {
    expect(numberReaderFlightSeconds(round)).toBeCloseTo(Math.max(1.2 - round * .1, .35));
    expect(numberReaderPhaseSeconds('READY', 10, round)).toBe(1.5);
    expect(numberReaderPhaseSeconds('FLY', 10, round)).toBeCloseTo(Math.max(1.2 - round * .1, .35));
    expect(numberReaderPhaseSeconds('ACTION', 10, round)).toBeCloseTo(Math.max(3.5 - round * .1, 2));
    expect(numberReaderPhaseSeconds('REVEAL', 10, round)).toBe(2.5);
  });

  it.each([5, 10, 15, 20])('completes %s rounds after final reveal and counts each visible capsule once', reps => {
    const complete = vi.fn(), progress = vi.fn();
    act(() => root.render(React.createElement(MovingNumberReaderTraining, { targetReps: reps, difficulty: 'hard', flightSeconds: 10, onComplete: complete, onProgress: progress })));
    for (let round = 1; round <= reps; round++) {
      reach('ACTION', round); expect(progress).toHaveBeenCalledTimes(round);
      reach('REVEAL', round); expect(complete).not.toHaveBeenCalled();
      if (round < reps) reach('READY', round + 1);
    }
    for (let i = 0; i < 260 && !complete.mock.calls.length; i++) step(10);
    expect(complete).toHaveBeenCalledOnce();
    expect(complete.mock.lastCall![0]).toMatchObject({ stims: reps, completionReason: 'natural_complete' });
    expect(complete.mock.lastCall![0].laneCount.reduce((a: number, b: number) => a + b, 0)).toBe(reps);
    expect(clock.frames.size).toBe(0);
  });

  it.each(['READY', 'FLY', 'ACTION', 'REVEAL'] as NumberReaderPhase[])('stops safely during %s and resets on remount', target => {
    const complete = vi.fn();
    const render = (key: number) => act(() => root.render(React.createElement(MovingNumberReaderTraining, { key, targetReps: 20, difficulty: 'hard', flightSeconds: 3, onComplete: complete, onProgress: () => {} })));
    render(1); reach(target, 1); if (target === 'FLY') step(300);
    act(() => host.querySelector('button')!.click());
    expect(complete.mock.lastCall![0]).toMatchObject({ stims: target === 'READY' ? 0 : 1, completionReason: target === 'READY' ? 'cancelled' : 'stopped_early' });
    expect(clock.frames.size).toBe(0);
    render(2); step(0); expect(phase()).toBe('READY');
    expect(host.querySelector('canvas')?.dataset.round).toBe('1');
  });

  it('fails closed if a whole flight was never visibly rendered', () => {
    const complete = vi.fn();
    act(() => root.render(React.createElement(MovingNumberReaderTraining, { targetReps: 10, difficulty: 'hard', flightSeconds: 3, onComplete: complete, onProgress: () => {} })));
    step(1500); step(1100);
    expect(complete.mock.lastCall![0]).toMatchObject({ stims: 0, completionReason: 'failed' });
  });

  it('preserves four paths, exact pixel margins, canonical zones, occlusion and minimum radius', () => {
    expect(catalogTrainingActivity('reactTrain', 15)).toBe('moving-number-reader');
    expect(NUMBER_READER_ZONES.map(z => z.id)).toEqual(['red', 'yellow', 'green', 'blue']);
    for (const path of [0, 1, 2, 3]) {
      const values = [.1, (path + .5) / 4, .3, .7];
      const trial = createNumberReaderTrial(() => values.shift()!);
      const start = numberReaderPosition(trial, 0, 390, 844), end = numberReaderPosition(trial, 1, 390, 844);
      expect(path < 2 ? Math.min(start.x, end.x) * 390 : Math.min(start.y, end.y) * 844).toBeCloseTo(-100);
      expect(path < 2 ? Math.max(start.x, end.x) * 390 : Math.max(start.y, end.y) * 844).toBeCloseTo((path < 2 ? 390 : 844) + 100);
      for (const round of [1, 3, 5]) expect(numberReaderOccluders(round, trial)).toHaveLength(round === 1 ? 0 : round === 3 ? 1 : 3);
    }
    expect(numberReaderRadius(30, 1440, 900)).toBe(36);
  });

  it('keeps historical fixed timing labels and marks new progressive results accurately', () => {
    const cfg = { mode: 'reactTrain', level: 15, activityId: 'moving-number-reader' as const, timeMode: 'reps', targetReps: 20, duration: 60, speed: 6 };
    const legacy = resolveTrainingResultRichContent(cfg, 18000, emptyColorStimulusCounts(), { stims: 2 });
    expect(legacy.volumeLabel).toBe('20회 · 비행 6초 · 제시 2회');
    const renewed = resolveTrainingResultRichContent({ ...cfg, numberReaderTiming: 'progressive' }, 18000, emptyColorStimulusCounts(), { stims: 2 });
    expect(renewed.volumeLabel).toContain('1.1→0.35초 자동 가속');
    expect(renewed.colorDominantLine).toBeNull();
  });

  it('paints opaque occluders after the target number', () => {
    const calls: string[] = [];
    const ctx = new Proxy({}, { get: (_, name) => (...args: unknown[]) => { if (name === 'fillText' && args[1] === 0 && args[2] === 0) calls.push('number'); if (name === 'fillRect' && args[2] === 120) calls.push('pillar'); } }) as CanvasRenderingContext2D;
    drawNumberReaderFrame(ctx, 1000, 600, createNumberReaderTrial(() => .02), 5, 'FLY', .35, 1000, .7);
    expect(calls.indexOf('pillar')).toBeGreaterThan(calls.indexOf('number'));
  });
});
