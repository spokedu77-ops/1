// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GoalkeeperReactionTraining } from './GoalkeeperReactionTraining';

const observed = vi.hoisted(() => ({ shots: new Set<number>(), waveTimes: new Set<number>() }));
vi.mock('three', async (original) => {
  const actual = await original<typeof import('three')>();
  return { ...actual, WebGLRenderer: class {
    setPixelRatio() {} setSize() {} dispose() {}
    render(scene: import('three').Scene) {
      for (const child of scene.children) {
        if (child.userData.startKey && !observed.shots.has(child.id)) {
          observed.shots.add(child.id); observed.waveTimes.add(performance.now());
        }
      }
    }
  } };
});

let root: Root;
let host: HTMLDivElement;
beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  vi.useFakeTimers({ toFake: ['performance', 'Date', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });
  vi.stubGlobal('requestAnimationFrame', (fn: FrameRequestCallback) => setTimeout(() => fn(performance.now()), 50));
  vi.stubGlobal('cancelAnimationFrame', (id: ReturnType<typeof setTimeout>) => clearTimeout(id));
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  const drawing = new Proxy({}, { get: () => () => {} });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
    (() => drawing) as unknown as typeof HTMLCanvasElement.prototype.getContext,
  );
  observed.shots.clear(); observed.waveTimes.clear();
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
});
afterEach(() => {
  act(() => root.unmount()); host.remove(); vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals();
});
function mount(rounds: number | undefined, speed: number, bonus: boolean, tier: 1 | 2 = 1, duration = 60) {
  const complete = vi.fn();
  act(() => root.render(React.createElement(GoalkeeperReactionTraining, {
    durationSec: duration, targetReps: rounds, speedSec: speed, bonusTimeEnabled: bonus,
    goalkeeperTier: tier, onExit: vi.fn(), onComplete: complete,
  })));
  return complete;
}
function advance(ms: number) { act(() => vi.advanceTimersByTime(ms)); }

describe('Goalkeeper real engine schedule with a virtual clock', () => {
  it('completes 30 rounds at six seconds beyond the old 60-second deadline', () => {
    const complete = mount(30, 6, false);
    advance(200000);
    expect(complete).toHaveBeenCalledTimes(1);
    expect(observed.waveTimes.size).toBe(30);
    expect(complete.mock.calls[0][0]).toMatchObject({ stims: 30 });
    expect(complete.mock.calls[0][0].stoppedEarly).not.toBe(true);
  });
  it.each([10, 15, 20, 30].flatMap(rounds => [1, 2, 3, 4, 5, 6].flatMap(speed => [false, true].map(bonus => ({ rounds, speed, bonus })))))
  ('$rounds rounds at $speed seconds, bonus=$bonus', ({ rounds, speed, bonus }) => {
    const complete = mount(rounds, speed, bonus);
    // Three-second countdown, all waves + final flight, then existing 15s bonus.
    advance(3000 + (rounds + 2) * speed * 1000 + (bonus ? 16000 : 0));
    expect(complete).toHaveBeenCalledTimes(1);
    if (!bonus) {
      expect(observed.waveTimes.size).toBe(rounds);
      expect(complete.mock.calls[0][0].stims).toBe(rounds);
    } else {
      expect(observed.waveTimes.size).toBeGreaterThan(rounds);
    }
    expect(complete.mock.calls[0][0].stoppedEarly).not.toBe(true);
    const shots = observed.shots.size;
    advance(30000);
    expect(complete).toHaveBeenCalledTimes(1);
    expect(observed.shots.size).toBe(shots);
    expect(vi.getTimerCount()).toBe(0);
  });
  it.each([false, true])('preserves time mode deadline, bonus=%s', bonus => {
    const complete = mount(undefined, 2, bonus, 1, 12);
    advance(14900); expect(complete).not.toHaveBeenCalled();
    advance(100); if (bonus) { expect(complete).not.toHaveBeenCalled(); advance(15000); }
    expect(complete).toHaveBeenCalledTimes(1);
  });
  it('finishes a double-shot round after both balls arrive', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.1);
    const complete = mount(10, 2, false, 2);
    advance(30000);
    expect(observed.waveTimes.size).toBe(10);
    expect(complete).toHaveBeenCalledTimes(1);
    expect(complete.mock.calls[0][0].stims).toBe(20);
  });
  it('enters BONUS once after the final wave arrives and ends after the existing 15 seconds', () => {
    const complete = mount(10, 2, true);
    advance(24900);
    expect(host.querySelector('.gk-hk')?.textContent).toBe('Rounds');
    expect(complete).not.toHaveBeenCalled();
    advance(400);
    expect(host.querySelector('.gk-hk')?.textContent).toBe('Bonus');
    expect(complete).not.toHaveBeenCalled();
    advance(14800); expect(complete).not.toHaveBeenCalled();
    advance(200); expect(complete).toHaveBeenCalledTimes(1);
    advance(30000); expect(complete).toHaveBeenCalledTimes(1);
  });
  it.each([0, 10000, 28000])('STOP at %ims remains early and releases timers', ms => {
    const complete = mount(10, 2, true);
    advance(ms);
    act(() => host.querySelector<HTMLButtonElement>('.gk-stop')!.click());
    expect(complete).toHaveBeenCalledTimes(1);
    expect(complete.mock.calls[0][0].stoppedEarly).toBe(true);
    advance(100000); expect(complete).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });
  it('unmount cancels the run without creating a natural completion', () => {
    const complete = mount(30, 6, true); advance(10000);
    act(() => root.unmount()); root = createRoot(host);
    advance(250000); expect(complete).not.toHaveBeenCalled(); expect(vi.getTimerCount()).toBe(0);
  });
});
