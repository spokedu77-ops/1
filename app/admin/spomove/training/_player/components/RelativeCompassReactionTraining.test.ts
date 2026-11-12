// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { RelativeCompassReactionTraining } from './RelativeCompassReactionTraining';
import { resetSpomoveRuntimeClock } from '../lib/runtimeClock';

vi.mock('./SignalDisplay', async () => {
  const { useEffect } = await import('react');
  return { SignalDisplay: ({ signal, animKey, onPresented }: { signal: Record<string, unknown> | null; animKey: number; onPresented?: (signal: Record<string, unknown>, key: number) => void }) => {
    useEffect(() => { if (signal) onPresented?.(signal, animKey); }, [signal, animKey, onPresented]);
    return null;
  } };
});

let root: Root;
let host: HTMLDivElement;
beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'performance', 'Date'] });
  vi.stubGlobal('requestAnimationFrame', (fn: FrameRequestCallback) => setTimeout(() => fn(performance.now()), 50));
  vi.stubGlobal('cancelAnimationFrame', (id: ReturnType<typeof setTimeout>) => clearTimeout(id));
  resetSpomoveRuntimeClock();
  vi.spyOn(Math, 'random').mockReturnValue(0); // red start, then down to green
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function mount(targetRounds = 1, difficulty: 'easy' | 'normal' | 'hard' = 'easy') {
  const complete = vi.fn();
  act(() => root.render(React.createElement(RelativeCompassReactionTraining, {
    targetRounds, difficulty, startSeconds: 2, responseSeconds: 2,
    effectsEnabled: false, onExit: vi.fn(), onComplete: complete,
  })));
  return complete;
}
async function advance(ms: number) {
  // Flush each animation frame so every presented cue is acknowledged by React.
  for (let elapsed = 0; elapsed < ms;) {
    const delta = Math.min(50, ms - elapsed);
    await act(async () => { await vi.advanceTimersByTimeAsync(delta); });
    elapsed += delta;
  }
}

it('waits for answer confirmation before revealing the destination and completing once', async () => {
  const complete = mount();
  await advance(14999); // countdown 3s + start 2s + five 2s cues
  expect(host.textContent).not.toContain('마지막 정답');
  expect(complete).not.toHaveBeenCalled();
  await advance(1);
  expect(host.textContent).toContain('정답 확인');
  expect(host.textContent).not.toContain('마지막 정답');
  expect(host.textContent).not.toContain('초록');
  await advance(10000);
  expect(complete).not.toHaveBeenCalled();
  const reveal = Array.from(host.querySelectorAll('button')).find(button => button.textContent === '정답 확인');
  await act(async () => { reveal!.click(); });
  expect(host.textContent).toContain('마지막 정답');
  expect(host.textContent).toContain('초록');
  expect(complete).not.toHaveBeenCalled();
  await advance(2000);
  expect(complete).toHaveBeenCalledTimes(1);
  expect(complete.mock.calls[0][0].stims).toBe(5);
  expect(complete.mock.calls[0][0].directionRecord.presented).toBe(5);
  expect(complete.mock.calls[0][0].directionRecord.executionMs).toBe(10000);
  expect(complete.mock.calls[0][0].directionRecord.journey.steps).toHaveLength(5);
  expect(complete.mock.calls[0][0].directionRecord.journey.steps[0].completed).toBe(true);
  await advance(10000);
  expect(complete).toHaveBeenCalledTimes(1);
});

it('cancels the pending answer timer when the player is removed', async () => {
  const complete = mount();
  await advance(15000);
  const reveal = Array.from(host.querySelectorAll('button')).find(button => button.textContent === '정답 확인');
  await act(async () => { reveal!.click(); });
  expect(host.textContent).toContain('마지막 정답');
  act(() => root.render(null));
  await advance(5000);
  expect(complete).not.toHaveBeenCalled();
});

it('records twenty seconds for ten two-second signals regardless of answer waiting', async () => {
  const complete = mount(1, 'normal');
  await advance(25000); // countdown + start position + ten cues
  expect(host.textContent).toContain('정답 확인');
  await advance(14000);
  expect(complete).not.toHaveBeenCalled();
  const reveal = Array.from(host.querySelectorAll('button')).find(button => button.textContent === '정답 확인');
  await act(async () => { reveal!.click(); });
  await advance(2000);
  const record = complete.mock.calls[0][0].directionRecord;
  expect(record.executionMs).toBe(20000);
  expect(record.journey.start).toEqual({ x: 0, y: 0 });
  expect(record.journey.steps).toHaveLength(10);
  expect(record.journey.steps.every((step: { completed: boolean }) => step.completed)).toBe(true);
});

it('counts only the partial cue when stopped mid-response', async () => {
  const complete = mount(10);
  await advance(6000); // countdown + start position + one second of the first cue
  const stop = Array.from(host.querySelectorAll('button')).find(button => button.textContent === 'STOP');
  await act(async () => { stop!.click(); });
  const record = complete.mock.calls[0][0].directionRecord;
  expect(record.executionMs).toBe(1000);
  expect(record.journey.steps).toHaveLength(1);
  expect(record.journey.steps[0].completed).toBe(false);
});

it('starts a new journey after each confirmed round and completes the configured series', async () => {
  const complete = mount(2);
  await advance(15000);
  const reveal = () => Array.from(host.querySelectorAll('button')).find(button => button.textContent === '정답 확인')!;
  await act(async () => { reveal().click(); });
  await advance(2000);
  expect(complete).not.toHaveBeenCalled();
  expect(host.textContent).toContain('2 / 2');
  await advance(12000); // new start position + five cues
  await act(async () => { reveal().click(); });
  await advance(2000);
  expect(complete).toHaveBeenCalledTimes(1);
  const record = complete.mock.calls[0][0].directionRecord;
  expect(record.completedRounds).toBe(2);
  expect(record.journeys).toHaveLength(2);
  expect(record.journeys.every((journey: { steps: unknown[] }) => journey.steps.length === 5)).toBe(true);
  expect(record.executionMs).toBe(20000);
});
