import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  isSpomoveRuntimePaused,
  resetSpomoveRuntimeClock,
  setSpomoveRuntimePaused,
  spomoveClearInterval,
  spomoveRuntimeNow,
  spomoveSetInterval,
} from './runtimeClock';

describe('SPOMOVE active runtime clock', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetSpomoveRuntimeClock();
  });

  afterEach(() => {
    resetSpomoveRuntimeClock();
    vi.useRealTimers();
  });

  it('excludes paused and background time from active elapsed time', () => {
    const startedAt = spomoveRuntimeNow();
    vi.advanceTimersByTime(20_000);
    expect(setSpomoveRuntimePaused(true)).toBe(true);
    expect(setSpomoveRuntimePaused(true)).toBe(false);
    vi.advanceTimersByTime(30_000);
    expect(spomoveRuntimeNow() - startedAt).toBeCloseTo(20_000, -1);
    expect(setSpomoveRuntimePaused(false)).toBe(true);
    expect(setSpomoveRuntimePaused(false)).toBe(false);
    vi.advanceTimersByTime(40_000);
    expect(spomoveRuntimeNow() - startedAt).toBeCloseTo(60_000, -1);
  });

  it('freezes interval-driven score and trial advancement while paused', () => {
    let trials = 0;
    const interval = spomoveSetInterval(() => { trials += 1; }, 1_000);
    vi.advanceTimersByTime(2_000);
    expect(trials).toBe(2);
    setSpomoveRuntimePaused(true);
    vi.advanceTimersByTime(10_000);
    expect(trials).toBe(2);
    setSpomoveRuntimePaused(false);
    vi.advanceTimersByTime(1_000);
    expect(trials).toBe(3);
    spomoveClearInterval(interval);
  });

  it('keeps foreground return paused until an explicit resume', () => {
    setSpomoveRuntimePaused(true);
    vi.advanceTimersByTime(5_000);
    expect(isSpomoveRuntimePaused()).toBe(true);
  });
});
