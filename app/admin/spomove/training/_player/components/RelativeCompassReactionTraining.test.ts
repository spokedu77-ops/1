// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { RelativeCompassReactionTraining } from './RelativeCompassReactionTraining';
import { resetSpomoveRuntimeClock } from '../lib/runtimeClock';

vi.mock('./SignalDisplay', () => ({ SignalDisplay: () => null }));

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

function mount() {
  const complete = vi.fn();
  act(() => root.render(React.createElement(RelativeCompassReactionTraining, {
    targetRounds: 1, difficulty: 'easy', startSeconds: 2, responseSeconds: 2,
    effectsEnabled: false, onExit: vi.fn(), onComplete: complete,
  })));
  return complete;
}
async function advance(ms: number) {
  await act(async () => { await vi.advanceTimersByTimeAsync(ms); });
}

it('shows the final destination before completing once', async () => {
  const complete = mount();
  await advance(6999); // countdown 3s + start 2s + response 2s
  expect(host.textContent).not.toContain('마지막 정답');
  expect(complete).not.toHaveBeenCalled();
  await advance(1);
  expect(host.textContent).toContain('마지막 정답');
  expect(host.textContent).toContain('초록');
  expect(complete).not.toHaveBeenCalled();
  await advance(2000);
  expect(complete).toHaveBeenCalledTimes(1);
  expect(complete.mock.calls[0][0].stims).toBe(1);
  await advance(10000);
  expect(complete).toHaveBeenCalledTimes(1);
});

it('cancels the pending answer timer when the player is removed', async () => {
  const complete = mount();
  await advance(7000);
  expect(host.textContent).toContain('마지막 정답');
  act(() => root.render(null));
  await advance(5000);
  expect(complete).not.toHaveBeenCalled();
});
