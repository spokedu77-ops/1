// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { VisualSearchReactionTraining } from '../components/VisualSearchReactionTraining';
import { generateSearchShapes, getVisualSearchShapeCount, isSearchSymbolOnlyRound, normalizeSearchStage, normalizeSearchTargetCount, normalizeSearchReps, normalizeSearchSeconds, registerSearchTask, searchShapePosition, VISUAL_SEARCH_ZONES } from './visualSearch';
import { catalogTrainingActivity, resolveTrainingSelection } from './trainingActivity';
import { resolveTrainingResultRichContent } from './trainingResultRichContent';
import { emptyColorStimulusCounts, settingsToTrainingResultConfig } from './trainingResultSummary';
import { settingsToExitResume } from './trainingLaunchSnapshot';

const clock = vi.hoisted(() => ({ now: 0, next: 0, frames: new Map<number, FrameRequestCallback>() }));
vi.mock('./runtimeClock', () => ({
  spomovePerformance: { now: () => clock.now },
  spomoveRequestAnimationFrame: (callback: FrameRequestCallback) => { const id = ++clock.next; clock.frames.set(id, callback); return id; },
  spomoveCancelAnimationFrame: (id: number) => clock.frames.delete(id),
  spomoveSetInterval: (callback: () => void, ms: number) => globalThis.setInterval(callback, ms),
  spomoveClearInterval: (id: ReturnType<typeof setInterval>) => globalThis.clearInterval(id),
}));

let root: Root;
let host: HTMLDivElement;
function revealAnswer() {
  const button = Array.from(host.querySelectorAll('button')).find(button => button.textContent === '정답 확인');
  expect(button).toBeDefined();
  act(() => button!.click());
  step(0);
}
function step(ms: number) {
  act(() => {
    clock.now += ms;
    vi.advanceTimersByTime(ms);
    const callbacks = [...clock.frames.values()]; clock.frames.clear();
    callbacks.forEach(callback => callback(clock.now));
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  clock.now = 0; clock.frames.clear();
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(new Proxy({}, { get: () => () => {} }) as never);
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
});
afterEach(() => { act(() => root.unmount()); host.remove(); vi.restoreAllMocks(); vi.useRealTimers(); });

describe('visual search runtime and records', () => {
  it('uses the shared 3, 2, 1 overlay and starts the first task only after three seconds', () => {
    const progress = vi.fn();
    act(() => root.render(React.createElement(VisualSearchReactionTraining, { targetReps: 20, searchSeconds: 5, onComplete: vi.fn(), onProgress: progress })));
    expect(host.querySelector('.react-train-cd-pop')?.textContent).toBe('3');
    expect(host.textContent).toContain('REPS'); expect(host.querySelector('button')?.textContent).toBe('STOP');
    step(1000); expect(host.querySelector('.react-train-cd-pop')?.textContent).toBe('2');
    step(1000); expect(host.querySelector('.react-train-cd-pop')?.textContent).toBe('1');
    step(999); expect(progress).not.toHaveBeenCalled();
    step(1); expect(host.querySelector('.react-train-cd-pop')).toBeNull(); expect(progress).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each([10, 20, 30, 40])('splits stage one into symbol-only and conjunction halves across %s rounds', totalRounds => {
    for (const targetVariantOffset of [0, 1, 2, 3]) {
      let previous = '';
      const firstHalf = new Set<string>(); const secondHalf = new Set<string>();
      for (let round = 1; round <= totalRounds; round++) {
        const shapes = generateSearchShapes({ stage: 1, targetCount: 2, round, totalRounds, targetVariantOffset });
        const targets = shapes.filter(shape => shape.target);
        expect(targets).toHaveLength(1);
        const target = targets[0]!;
        const signature = `${target.color}:${target.type}`;
        expect(signature).not.toBe(previous); previous = signature;
        expect(shapes.filter(shape => shape.color === target.color && shape.type === target.type)).toHaveLength(1);
        const differentShape = shapes.filter(shape => !shape.target && shape.color === target.color && shape.type !== target.type);
        const differentColor = shapes.filter(shape => !shape.target && shape.color !== target.color && shape.type === target.type);
        expect(isSearchSymbolOnlyRound(1, round, totalRounds)).toBe(round <= totalRounds / 2);
        if (round <= totalRounds / 2) {
          firstHalf.add(signature);
          expect(differentShape).toHaveLength(shapes.length - 1);
          expect(differentColor).toHaveLength(0);
          expect(shapes.every(shape => shape.color === '#F8FAFC')).toBe(true);
        } else {
          secondHalf.add(signature);
          expect(differentShape.length).toBeGreaterThan(0); expect(differentColor.length).toBeGreaterThan(0);
          expect(Math.abs(differentShape.length - differentColor.length)).toBeLessThanOrEqual(1);
        }
        const moving = generateSearchShapes({ stage: 2, targetCount: 1, round, totalRounds });
        expect(moving.some(shape => shape.type === 'plus')).toBe(true);
      }
      expect(firstHalf.size).toBe(2); expect(secondHalf.size).toBe(4);
    }
  });

  it.each([1, 3.5, 6, 10].flatMap(seconds => [10, 20, 30, 40].map(reps => [seconds, reps])))('runs fixed %s-second searches for exactly %s presented tasks', (seconds, reps) => {
    const complete = vi.fn(); const progress = vi.fn();
    act(() => root.render(React.createElement(VisualSearchReactionTraining, { searchSeconds: seconds!, targetReps: reps!, onComplete: complete, onProgress: progress })));
    step(3000);
    for (let i = 1; i <= reps!; i++) {
      expect(progress).toHaveBeenCalledTimes(i);
      expect(host.textContent).toContain(`${normalizeSearchSeconds(seconds).toFixed(1)}초`);
      step(normalizeSearchSeconds(seconds) * 1000 - 1);
      expect(host.textContent).not.toContain('정답 ·');
      step(1); expect(host.textContent).toContain('정답 확인');
      step(10000); expect(host.textContent).not.toContain('정답 ·');
      expect(complete).not.toHaveBeenCalled();
      revealAnswer(); expect(host.textContent).toContain('정답 ·');
      expect(complete).not.toHaveBeenCalled(); step(3000);
    }
    expect(complete).toHaveBeenCalledOnce();
    const stats = complete.mock.calls[0]![0];
    expect(stats.stims).toBe(reps); expect(stats.completionReason).toBe('natural_complete');
    expect(stats.laneCount.reduce((a: number, b: number) => a + b, 0)).toBe(reps);
    expect(clock.frames.size).toBe(0);
  });

  it('distinguishes cancellation, stop and retry, cleaning every frame', () => {
    const complete = vi.fn(); const progress = vi.fn();
    const render = (key: number) => act(() => root.render(React.createElement(VisualSearchReactionTraining, { key, searchSeconds: 5, targetReps: 20, onComplete: complete, onProgress: progress })));
    render(1); act(() => host.querySelector('button')!.click());
    expect(complete.mock.lastCall![0]).toMatchObject({ stims: 0, completionReason: 'cancelled' });
    expect(clock.frames.size).toBe(0);
    render(2); step(3000); step(5000); revealAnswer(); step(3000);
    act(() => host.querySelector('button')!.click());
    expect(complete.mock.lastCall![0]).toMatchObject({ stims: 2, completionReason: 'stopped_early' });
    expect(clock.frames.size).toBe(0);
    render(3); step(3000); expect(progress.mock.lastCall![0]).toBe(1);
    act(() => root.unmount()); root = createRoot(host);
    expect(clock.frames.size).toBe(0);
  });

  it('keeps exactly one correct target and the same physical zone through movement and resize', () => {
    expect(VISUAL_SEARCH_ZONES.map(zone => zone.id)).toEqual(['red', 'yellow', 'green', 'blue']);
    for (const stage of [1, 2] as const) for (let round = 1; round <= 40; round++) {
      const shapes = generateSearchShapes({ stage, targetCount: 1, round, totalRounds: 40 });
      expect(shapes.filter(shape => shape.target)).toHaveLength(1);
      const target = shapes.find(shape => shape.target)!;
      expect(shapes.filter(shape => shape.color === target.color && shape.type === target.type)).toHaveLength(1);
      for (const shape of shapes) for (const seconds of [0, 1, 3.5, 6, 10]) {
        const p = searchShapePosition(shape, stage, seconds);
        expect((p.x < 0.5 ? 0 : 1) + (p.y < 0.5 ? 0 : 2)).toBe(shape.zone);
      }
    }
  });

  it.each([1, 2] as const)('reaches the stage %s limits monotonically for every repetition option', stage => {
    for (const total of [10, 20, 30, 40]) {
      const counts = Array.from({ length: total }, (_, i) => getVisualSearchShapeCount(stage, i + 1, total));
      expect(counts[0]).toBe(stage === 1 ? 10 : 20);
      expect(counts.at(-1)).toBe(stage === 1 ? 30 : 60);
      expect(counts.every((count, i) => i === 0 || count >= counts[i - 1]!)).toBe(true);
      expect(getVisualSearchShapeCount(stage, -10, total)).toBe(counts[0]);
      expect(getVisualSearchShapeCount(stage, 100, total)).toBe(counts.at(-1));
    }
  });

  it.each([1, 2] as const)('varies the rare stage-two combination every round with exactly %s target(s)', targetCount => {
    for (const targetVariantOffset of [0, 1, 2, 3]) {
      let previous = '';
      const signatures = new Set<string>();
      for (let round = 1; round <= 40; round++) {
        const shapes = generateSearchShapes({ stage: 2, targetCount, round, totalRounds: 40, targetVariantOffset });
        const targets = shapes.filter(shape => shape.target);
        const target = targets[0]!;
        const signature = `${target.color}:${target.type}`;
        expect(signature).not.toBe(previous);
        previous = signature; signatures.add(signature);
        expect(targets).toHaveLength(targetCount);
        expect(targets.every(shape => shape.color === target.color && shape.type === target.type)).toBe(true);
        expect(new Set(targets.map(shape => shape.zone)).size).toBe(targetCount);
        expect(shapes.filter(shape => shape.color === target.color && shape.type === target.type)).toHaveLength(targetCount);
        expect(shapes.filter(shape => !shape.target && shape.color === target.color && shape.type !== target.type).length).toBeGreaterThan(targetCount);
        expect(shapes.filter(shape => !shape.target && shape.color !== target.color && shape.type === target.type).length).toBeGreaterThan(targetCount);
      }
      expect(signatures.size).toBe(4);
    }
  });

  it('normalizes legacy settings and retains stage and targets through resume and result projection', () => {
    expect(normalizeSearchStage()).toBe(1);
    expect(normalizeSearchTargetCount()).toBe(1);
    expect(normalizeSearchTargetCount(1, 2)).toBe(1);
    expect(normalizeSearchTargetCount(2, 2)).toBe(2);
    expect(normalizeSearchReps()).toBe(20);
    expect(normalizeSearchSeconds(10)).toBe(6);
    expect(normalizeSearchSeconds(0)).toBe(1);
    expect(normalizeSearchSeconds(3.7)).toBe(3.5);
    expect(normalizeSearchSeconds(NaN)).toBe(5);
    const cfg = { mode: 'flanker', level: 7, activityId: 'visual-search' as const, visualSearchStage: 2 as const, visualSearchTargetCount: 2 as const, speed: 5, targetReps: 10, timeMode: 'reps', duration: 60 };
    const resume = settingsToExitResume({ ...cfg, flowFeatures: new Set(), sportsArenaFeatures: new Set() });
    expect(resume.launch).toMatchObject({ visualSearchStage: 2, visualSearchTargetCount: 2 });
    expect(settingsToTrainingResultConfig(cfg)).toMatchObject({ visualSearchStage: 2, visualSearchTargetCount: 2 });
  });

  it('balances both distractor types and preserves all 60 non-overlapping shapes during movement and resize', () => {
    for (let sample = 0; sample < 20; sample++) {
      const shapes = generateSearchShapes({ stage: 2, targetCount: 2, round: 10, totalRounds: 10 });
      expect(shapes).toHaveLength(60);
      const targets = shapes.filter(shape => shape.target);
      expect(targets).toHaveLength(2);
      expect(new Set(targets.map(shape => shape.zone)).size).toBe(2);
      const target = targets[0]!;
      expect(shapes.filter(shape => shape.color === target.color && shape.type === target.type)).toEqual(targets);
      expect(shapes.filter(shape => !shape.target && shape.color === target.color && shape.type !== target.type)).toHaveLength(29);
      expect(shapes.filter(shape => !shape.target && shape.color !== target.color && shape.type === target.type)).toHaveLength(29);
      let contained = true;
      let separated = true;
      for (const [width, height] of [[320, 280], [375, 400], [768, 700], [1440, 700]]) for (let time = 0; time <= 6; time += 0.25) {
        const radius = Math.min(width!, height!) * 0.022 + 0.5;
        const positions = shapes.map(shape => searchShapePosition(shape, 2, time));
        positions.forEach((position, i) => {
          const shape = shapes[i]!;
          const x = position.x * width!; const y = position.y * height!;
          contained &&= x - radius > (shape.zone % 2) * width! / 2
            && x + radius < (shape.zone % 2 + 1) * width! / 2
            && y - radius > Math.floor(shape.zone / 2) * height! / 2 + 24
            && y + radius < (Math.floor(shape.zone / 2) + 1) * height! / 2;
          for (let j = i + 1; j < shapes.length; j++) {
            // Conservative bounding boxes include the full symbol stroke.
            separated &&= Math.abs(position.x - positions[j]!.x) * width! > 2 * radius || Math.abs(position.y - positions[j]!.y) * height! > 2 * radius;
          }
        });
      }
      expect(contained).toBe(true);
      expect(separated).toBe(true);
      for (const shape of shapes) expect(searchShapePosition(shape, 1, 6)).toEqual({ x: shape.x, y: shape.y });
    }
  });

  it('waits for confirmation, reveals two targets for three seconds and records ten tasks / twenty targets', () => {
    const complete = vi.fn(); const progress = vi.fn();
    act(() => root.render(React.createElement(VisualSearchReactionTraining, { visualSearchStage: 2, visualSearchTargetCount: 2, searchSeconds: 1, targetReps: 10, onComplete: complete, onProgress: progress })));
    step(3000);
    for (let round = 1; round <= 10; round++) {
      step(999); expect(host.textContent).not.toContain('정답 ·');
      step(1); expect(host.textContent).toContain('정답 확인');
      step(10000); expect(complete).not.toHaveBeenCalled();
      expect(progress).toHaveBeenCalledTimes(round);
      revealAnswer(); expect(host.textContent).toContain('정답 · 표시된 2곳');
      expect(host.querySelectorAll('button')).toHaveLength(1);
      expect(host.querySelector('button')?.textContent).toBe('STOP');
      step(2999); expect(progress).toHaveBeenCalledTimes(round);
      expect(complete).not.toHaveBeenCalled(); step(1);
    }
    expect(complete).toHaveBeenCalledOnce();
    const stats = complete.mock.lastCall![0];
    expect(stats.stims).toBe(10);
    expect(stats.laneCount.reduce((a: number, b: number) => a + b, 0)).toBe(20);
    expect(stats.completionReason).toBe('natural_complete');
    expect(stats).not.toHaveProperty('accuracy');
  });

  it('can stop during confirmed reveal without a duplicate callback', () => {
    const complete = vi.fn();
    act(() => root.render(React.createElement(VisualSearchReactionTraining, { visualSearchStage: 2, visualSearchTargetCount: 2, searchSeconds: 1, targetReps: 10, onComplete: complete, onProgress: vi.fn() })));
    step(3000); step(1000); revealAnswer();
    act(() => { host.querySelector('button')!.click(); host.querySelector('button')!.click(); }); step(60000);
    expect(complete).toHaveBeenCalledOnce();
    expect(complete.mock.lastCall![0]).toMatchObject({ stims: 1, completionReason: 'stopped_early' });
    expect(clock.frames.size).toBe(0);
  });

  it.each([1, 2] as const)('keeps task and target units separate for %s target(s), including legacy fallback', targetCount => {
    let counts = emptyColorStimulusCounts();
    for (let round = 1; round <= 10; round++) counts = registerSearchTask(counts, generateSearchShapes({ stage: 2, targetCount, round, totalRounds: 10 }));
    const cfg = { mode: 'flanker', level: 7, activityId: 'visual-search' as const, visualSearchStage: 2 as const, visualSearchTargetCount: targetCount, speed: 5, targetReps: 10, duration: 60, timeMode: 'reps' };
    for (const options of [{ stims: 10, completionReason: 'natural_complete' as const }, undefined]) {
      const rich = resolveTrainingResultRichContent(cfg, 100000, counts, options);
      expect(rich.sessionSnapshot.find(item => item.id === 'presented')?.value).toBe('10회');
      expect(rich.sessionSnapshot.find(item => item.id === 'target-shapes')?.value).toBe(`${targetCount * 10}개`);
    }
  });

  it('reports an animation failure and releases its frame', () => {
    vi.restoreAllMocks();
    const context = new Proxy({}, { get: (object, key) => Reflect.get(object, key) ?? (() => {}) }) as CanvasRenderingContext2D;
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context as never);
    const complete = vi.fn();
    act(() => root.render(React.createElement(VisualSearchReactionTraining, { searchSeconds: 5, targetReps: 20, onComplete: complete, onProgress: vi.fn() })));
    Object.defineProperty(context, 'fillRect', { value: () => { throw new Error('render failure'); } });
    step(3000);
    expect(complete.mock.lastCall![0].completionReason).toBe('failed');
    expect(clock.frames.size).toBe(0);
  });

  it('reports a task-generation failure at the end of the shared countdown and cleans up', () => {
    const complete = vi.fn();
    act(() => root.render(React.createElement(VisualSearchReactionTraining, { searchSeconds: 5, targetReps: 20, onComplete: complete, onProgress: vi.fn() })));
    vi.spyOn(Math, 'random').mockImplementationOnce(() => { throw new Error('generation failure'); });
    step(3000);
    expect(complete).toHaveBeenCalledOnce();
    expect(complete.mock.lastCall![0]).toMatchObject({ stims: 0, completionReason: 'failed' });
    expect(clock.frames.size).toBe(0); expect(vi.getTimerCount()).toBe(0);
  });

  it('preserves legacy flanker identities and uses task-specific result copy', () => {
    expect(catalogTrainingActivity('flanker', 7)).toBe('visual-search');
    expect(resolveTrainingSelection('flanker', 7).runtime).toBe('visual-search');
    expect([1, 2, 3, 4, 5, 6].map(level => resolveTrainingSelection('flanker', level).activityId)).toEqual(['flanker-arrow', 'flanker-theme', 'flanker-extreme', 'flanker-nested', 'flanker-arrow', 'flanker-theme']);
    const rich = resolveTrainingResultRichContent({ mode: 'flanker', level: 7, activityId: 'visual-search', speed: 3.5, targetReps: 20, duration: 60, timeMode: 'reps' }, 9000, emptyColorStimulusCounts(), { completionReason: 'stopped_early', stims: 2 });
    expect(rich.volumeLabel).toContain('제시 2회');
    expect(rich.volumeLabel).toContain('탐색 3.5초');
    expect(JSON.stringify(rich)).not.toContain('가운데');
    expect(normalizeSearchSeconds()).toBe(5);
  });
});
