// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { VisualSearchReactionTraining } from '../components/VisualSearchReactionTraining';
import { generateSearchShapes, normalizeSearchSeconds, searchShapePosition, VISUAL_SEARCH_ZONES } from './visualSearch';
import { catalogTrainingActivity, resolveTrainingSelection } from './trainingActivity';
import { resolveTrainingResultRichContent } from './trainingResultRichContent';
import { emptyColorStimulusCounts } from './trainingResultSummary';

const clock = vi.hoisted(() => ({ now: 0, next: 0, frames: new Map<number, FrameRequestCallback>() }));
vi.mock('./runtimeClock', () => ({
  spomovePerformance: { now: () => clock.now },
  spomoveRequestAnimationFrame: (callback: FrameRequestCallback) => { const id = ++clock.next; clock.frames.set(id, callback); return id; },
  spomoveCancelAnimationFrame: (id: number) => clock.frames.delete(id),
}));

let root: Root;
let host: HTMLDivElement;
function step(ms: number) {
  act(() => {
    clock.now += ms;
    const callbacks = [...clock.frames.values()]; clock.frames.clear();
    callbacks.forEach(callback => callback(clock.now));
  });
}

beforeEach(() => {
  clock.now = 0; clock.frames.clear();
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(new Proxy({}, { get: () => () => {} }) as never);
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
});
afterEach(() => { act(() => root.unmount()); host.remove(); vi.restoreAllMocks(); });

describe('visual search runtime and records', () => {
  it.each([1, 3.5, 6, 10].flatMap(seconds => [10, 20, 30, 40].map(reps => [seconds, reps])))('runs fixed %s-second searches for exactly %s presented tasks', (seconds, reps) => {
    const complete = vi.fn(); const progress = vi.fn();
    act(() => root.render(React.createElement(VisualSearchReactionTraining, { searchSeconds: seconds!, targetReps: reps!, onComplete: complete, onProgress: progress })));
    step(3000);
    for (let i = 1; i <= reps!; i++) {
      expect(progress).toHaveBeenCalledTimes(i);
      expect(host.textContent).toContain(`${seconds!.toFixed(1)}초`);
      step(seconds! * 1000 - 1);
      expect(host.textContent).not.toContain('정답 ·');
      step(1); expect(host.textContent).toContain('정답 ·');
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
    render(2); step(3000); step(5000); step(3000);
    act(() => host.querySelector('button')!.click());
    expect(complete.mock.lastCall![0]).toMatchObject({ stims: 2, completionReason: 'stopped_early' });
    expect(clock.frames.size).toBe(0);
    render(3); step(3000); expect(progress.mock.lastCall![0]).toBe(1);
    act(() => root.unmount()); root = createRoot(host);
    expect(clock.frames.size).toBe(0);
  });

  it('keeps exactly one correct target and the same physical zone through movement and resize', () => {
    expect(VISUAL_SEARCH_ZONES.map(zone => zone.id)).toEqual(['red', 'yellow', 'green', 'blue']);
    for (let round = 1; round <= 40; round++) {
      const shapes = generateSearchShapes(round);
      expect(shapes.filter(shape => shape.target)).toHaveLength(1);
      expect(shapes.filter(shape => shape.color === (round < 3 ? 'red' : 'blue') && shape.type === (round < 3 ? 'circle' : 'square'))).toHaveLength(1);
      for (const shape of shapes) for (const seconds of [0, 1, 3.5, 6, 10]) {
        const p = searchShapePosition(shape, round, seconds);
        expect((p.x < 0.5 ? 0 : 1) + (p.y < 0.5 ? 0 : 2)).toBe(shape.zone);
      }
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
