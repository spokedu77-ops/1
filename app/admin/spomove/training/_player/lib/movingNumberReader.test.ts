// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MovingNumberReaderTraining } from '../components/MovingNumberReaderTraining';
import { createNumberReaderTrial, normalizeNumberReaderSeconds, numberReaderOccluders, numberReaderPhaseSeconds,
  numberReaderPillars, numberReaderPosition, numberReaderRadius, NUMBER_READER_ZONES, type NumberReaderPhase } from './movingNumberReader';
import { drawNumberReaderFrame } from './movingNumberReaderCanvas';
import { catalogTrainingActivity, resolveTrainingSelection } from './trainingActivity';
import { describeSessionVolume, emptyColorStimulusCounts } from './trainingResultSummary';
import { resolveTrainingResultRichContent } from './trainingResultRichContent';

const clock = vi.hoisted(() => ({ now: 0, next: 0, frames: new Map<number, FrameRequestCallback>() }));
vi.mock('./runtimeClock', () => ({
  spomovePerformance: { now: () => clock.now },
  spomoveRequestAnimationFrame: (callback: FrameRequestCallback) => { const id = ++clock.next; clock.frames.set(id, callback); return id; },
  spomoveCancelAnimationFrame: (id: number) => clock.frames.delete(id),
}));
let host: HTMLDivElement; let root: Root;
function step(ms: number) {
  act(() => { clock.now += ms; const callbacks = [...clock.frames.values()]; clock.frames.clear(); callbacks.forEach(callback => callback(clock.now)); });
}
beforeEach(() => {
  clock.now = 0; clock.frames.clear();
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(new Proxy({}, { get: () => () => {} }) as never);
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
});
afterEach(() => { act(() => root.unmount()); host.remove(); vi.restoreAllMocks(); });

describe('moving number reader', () => {
  it.each([1, 3, 6, 10].flatMap(seconds => [10, 15, 20, 30].map(reps => [seconds, reps])))('keeps %s-second flights for %s full rounds', (seconds, reps) => {
    const complete = vi.fn(); const progress = vi.fn();
    act(() => root.render(React.createElement(MovingNumberReaderTraining, { flightSeconds: seconds!, targetReps: reps!, onComplete: complete, onProgress: progress })));
    for (let round = 1; round <= reps!; round++) {
      step(1499); expect(host.textContent).toContain('READY'); expect(progress).toHaveBeenCalledTimes(round - 1);
      step(1); expect(host.textContent).toContain('FLY');
      step(seconds! * 200); expect(progress).toHaveBeenCalledTimes(round);
      step(seconds! * 800 - 1); expect(host.textContent).toContain('FLY');
      step(1); expect(host.textContent).toContain('ACTION');
      step(2999); expect(host.textContent).toContain('ACTION');
      step(1); expect(host.textContent).toContain('REVEAL');
      step(2499); expect(complete).not.toHaveBeenCalled();
      step(1);
    }
    expect(complete).toHaveBeenCalledOnce();
    const stats = complete.mock.lastCall![0];
    expect(stats).toMatchObject({ stims: reps, completionReason: 'natural_complete' });
    expect(stats.laneCount.reduce((a: number, b: number) => a + b, 0)).toBe(reps);
    expect(clock.frames.size).toBe(0);
  });

  it.each(['READY', 'FLY', 'ACTION', 'REVEAL'] as NumberReaderPhase[])('stops in %s and resets on retry', phase => {
    const complete = vi.fn(); const progress = vi.fn();
    const render = (key: number) => act(() => root.render(React.createElement(MovingNumberReaderTraining, { key, flightSeconds: 3, targetReps: 20, onComplete: complete, onProgress: progress })));
    render(1);
    if (phase !== 'READY') { step(1500); step(600); }
    if (phase === 'ACTION' || phase === 'REVEAL') step(2400);
    if (phase === 'REVEAL') step(3000);
    act(() => host.querySelector('button')!.click());
    expect(complete.mock.lastCall![0]).toMatchObject({ stims: phase === 'READY' ? 0 : 1, completionReason: phase === 'READY' ? 'cancelled' : 'stopped_early' });
    expect(clock.frames.size).toBe(0);
    render(2); step(0); expect(host.textContent).toContain('1 / 20회'); expect(host.textContent).toContain('READY');
    act(() => root.unmount()); root = createRoot(host); expect(clock.frames.size).toBe(0);
  });

  it('fails instead of completing a flight that was never rendered visibly', () => {
    const complete = vi.fn();
    act(() => root.render(React.createElement(MovingNumberReaderTraining, { flightSeconds: 3, targetReps: 10, onComplete: complete, onProgress: vi.fn() })));
    step(1500); step(3000);
    expect(complete.mock.lastCall![0]).toMatchObject({ stims: 0, completionReason: 'failed' });
    expect(clock.frames.size).toBe(0);
  });

  it('records seven presented capsules when stopped during round seven of twenty', () => {
    const complete = vi.fn();
    act(() => root.render(React.createElement(MovingNumberReaderTraining, { flightSeconds: 3, targetReps: 20, onComplete: complete, onProgress: vi.fn() })));
    for (let round = 1; round < 7; round++) { step(1500); step(600); step(2400); step(3000); step(2500); }
    step(1500); step(600);
    act(() => host.querySelector('button')!.click());
    const stats = complete.mock.lastCall![0];
    expect(stats).toMatchObject({ stims: 7, completionReason: 'stopped_early' });
    expect(stats.laneCount.reduce((a: number, b: number) => a + b, 0)).toBe(7);
  });

  it('keeps four original paths, numeric mappings, perpendicular occluders and minimum size', () => {
    expect(NUMBER_READER_ZONES.map(zone => [zone.number, zone.id])).toEqual([[1, 'red'], [2, 'yellow'], [3, 'green'], [4, 'blue']]);
    for (const path of [0, 1, 2, 3]) for (const number of [1, 2, 3, 4]) {
      const values = [(number - 0.5) / 4, (path + 0.5) / 4, 0.3, 0.7];
      const trial = createNumberReaderTrial(() => values.shift()!);
      expect(trial).toMatchObject({ number, path });
      const start = numberReaderPosition(trial, 0); const end = numberReaderPosition(trial, 1);
      if (path === 0) { expect(start.x).toBeLessThan(0); expect(end.x).toBeGreaterThan(1); }
      if (path === 1) { expect(start.x).toBeGreaterThan(1); expect(end.x).toBeLessThan(0); }
      if (path === 2) { expect(start.y).toBeLessThan(0); expect(end.y).toBeGreaterThan(1); }
      if (path === 3) { expect(start.y).toBeGreaterThan(1); expect(end.y).toBeLessThan(0); }
      for (const round of [1, 2, 3, 4, 5, 30]) {
        const rects = numberReaderOccluders(round, trial);
        expect(rects).toHaveLength(numberReaderPillars(round));
        expect(rects.every(rect => path < 2 ? rect.height === 1 && rect.width === 0.12 : rect.width === 1 && rect.height === 0.12)).toBe(true);
      }
    }
    expect([1, 2, 3, 4, 5, 30].map(numberReaderPillars)).toEqual([0, 0, 1, 1, 3, 3]);
    expect(numberReaderRadius(30, 1440, 900)).toBe(36);
    expect(numberReaderRadius(1, 1440, 900)).toBeGreaterThan(numberReaderRadius(5, 1440, 900));
    expect(normalizeNumberReaderSeconds()).toBe(3);
    expect(['READY', 'FLY', 'ACTION', 'REVEAL'].map(phase => numberReaderPhaseSeconds(phase as NumberReaderPhase, 10))).toEqual([1.5, 10, 3, 2.5]);
  });

  it('paints opaque pillars after the capsule number and does not repeat it during ACTION', () => {
    const calls: { name: string; args: unknown[] }[] = [];
    const ctx = new Proxy({}, { get: (_, name: string) => (...args: unknown[]) => calls.push({ name, args }) }) as CanvasRenderingContext2D;
    const trial = createNumberReaderTrial(() => 0.1);
    drawNumberReaderFrame(ctx, 1000, 600, trial, 5, 'FLY', 0.5, 1000, 3);
    const text = calls.findIndex(call => call.name === 'fillText' && call.args[1] === 0 && call.args[2] === 0);
    const pillar = calls.findIndex(call => call.name === 'fillRect' && call.args[2] === 120 && call.args[3] === 600);
    expect(text).toBeGreaterThan(-1); expect(pillar).toBeGreaterThan(text);
    calls.length = 0;
    drawNumberReaderFrame(ctx, 1000, 600, trial, 5, 'ACTION', 0.5, 1000, 3);
    expect(calls.some(call => call.name === 'fillText' && call.args[1] === 0 && call.args[2] === 0)).toBe(false);
  });

  it('uses repetition results without changing existing timed reaction results', () => {
    expect(catalogTrainingActivity('reactTrain', 15)).toBe('moving-number-reader');
    expect(resolveTrainingSelection('reactTrain', 15)).toMatchObject({ runtime: 'moving-number-reader', engineLevel: 15 });
    const cfg = { mode: 'reactTrain', level: 15, activityId: 'moving-number-reader' as const, timeMode: 'reps', targetReps: 20, duration: 60, speed: 6 };
    expect(describeSessionVolume(cfg)).toBe('20회');
    expect(describeSessionVolume({ ...cfg, activityId: 'wave-dodge', level: 1, timeMode: 'time' })).toBe('60초');
    const result = resolveTrainingResultRichContent(cfg, 18000, emptyColorStimulusCounts(), { completionReason: 'stopped_early', stims: 2 });
    expect(result.volumeLabel).toBe('20회 · 비행 6초 · 제시 2회');
    expect(result.programSummary).toContain('숫자 캡슐');
    expect(result.colorDominantLine).toBeNull();
  });
});
