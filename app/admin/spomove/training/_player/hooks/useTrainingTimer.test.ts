// @vitest-environment happy-dom
import React, { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useTrainingTimer } from './useTrainingTimer';
import { COLORS } from '../constants';

const clock = vi.hoisted(() => ({ now: 1000, next: 0, frames: new Map<number, FrameRequestCallback>() }));
vi.mock('../lib/runtimeClock', () => ({
  spomovePerformance: { now: () => clock.now },
  spomoveRequestAnimationFrame: (callback: FrameRequestCallback) => {
    const id = ++clock.next; clock.frames.set(id, callback); return id;
  },
  spomoveCancelAnimationFrame: (id: number) => clock.frames.delete(id),
}));
vi.mock('../lib/audio', () => ({ playBeep: vi.fn(), getBeepForSignal: vi.fn(), getSignalVoice: vi.fn() }));
vi.mock('../lib/tts', () => ({ tts: vi.fn(), ttsClear: vi.fn() }));

let host: HTMLDivElement;
let root: Root;
const emitted = vi.fn();
const finished = vi.fn();
function Player({ accel = false, targetReps = 5, timeMode = 'reps', active = true }) {
  const [presented, setPresented] = useState(0);
  const [done, setDone] = useState(false);
  useTrainingTimer({ active: active && !done, speed: 1, accel, timeMode, duration: 5, targetReps,
    mode: 'basic', level: 1, activityId: 'direction-cue', audioMode: 'off', colors: COLORS,
    onSignal: () => { emitted(clock.now); setPresented(value => value + 1); },
    onFinish: () => { finished(clock.now); setDone(true); },
  });
  return React.createElement('div', null, done ? 'result' : `cue ${presented}`);
}
function step(ms: number) {
  act(() => {
    clock.now += ms;
    const frames = [...clock.frames.values()]; clock.frames.clear();
    frames.forEach(frame => frame(clock.now));
  });
}
beforeEach(() => {
  clock.now = 1000; clock.frames.clear(); emitted.mockClear(); finished.mockClear();
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
});
afterEach(() => { act(() => root.unmount()); host.remove(); });

describe('signal repetition final-cue lifetime', () => {
  it('renders all five 1-second cues before completing, without a sixth cue', () => {
    act(() => root.render(React.createElement(Player)));
    step(0);
    for (let count = 2; count <= 5; count++) step(1000);
    expect(host.textContent).toBe('cue 5');
    expect(finished).not.toHaveBeenCalled();
    step(999); expect(host.textContent).toBe('cue 5');
    step(1); expect(host.textContent).toBe('result');
    expect(emitted).toHaveBeenCalledTimes(5); expect(finished).toHaveBeenCalledTimes(1);
    step(1000); expect(finished).toHaveBeenCalledTimes(1);
  });

  it('preserves a late final cue across the next nominal clock boundary', () => {
    act(() => root.render(React.createElement(Player)));
    step(0); step(1000); step(1000); step(1000); step(1008);
    step(992); // 5 seconds elapsed, but the final cue has only had 992ms.
    expect(host.textContent).toBe('cue 5');
    expect(emitted).toHaveBeenCalledTimes(5); expect(finished).not.toHaveBeenCalled();
    step(8); expect(host.textContent).toBe('result');
    expect(emitted).toHaveBeenCalledTimes(5);
  });

  it.each([false, true])('shows a single target for its full interval (acceleration %s)', accel => {
    act(() => root.render(React.createElement(Player, { accel, targetReps: 1 })));
    step(0); expect(host.textContent).toBe('cue 1');
    step(999); expect(finished).not.toHaveBeenCalled();
    step(1); expect(host.textContent).toBe('result');
    expect(emitted).toHaveBeenCalledTimes(1);
  });

  it('honors the accelerated final interval and emits no extra cue', () => {
    act(() => root.render(React.createElement(Player, { accel: true })));
    step(0); step(1000); step(1000); step(1000); step(1000);
    expect(host.textContent).toBe('cue 5');
    step(679); expect(finished).not.toHaveBeenCalled();
    step(1); expect(host.textContent).toBe('result');
    expect(emitted).toHaveBeenCalledTimes(5);
  });

  it('keeps elapsed-time completion unchanged', () => {
    act(() => root.render(React.createElement(Player, { timeMode: 'time' })));
    step(0); step(1000); step(1000); step(1000); step(1000);
    step(999); expect(finished).not.toHaveBeenCalled();
    step(1); expect(finished).toHaveBeenCalledTimes(1);
    expect(emitted).toHaveBeenCalledTimes(5);
  });

  it('cancels pending completion when stopped during the last cue', () => {
    act(() => root.render(React.createElement(Player)));
    step(0); step(1000); step(1000); step(1000); step(1000);
    act(() => root.render(React.createElement(Player, { active: false })));
    step(2000); expect(finished).not.toHaveBeenCalled();
    expect(emitted).toHaveBeenCalledTimes(5);
    expect(clock.frames.size).toBe(0);
  });
});
