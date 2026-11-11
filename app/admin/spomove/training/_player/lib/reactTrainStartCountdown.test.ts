import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runReactTrainStartCountdown } from './reactTrainStartCountdown';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('shared training start countdown', () => {
  it('waits the full three seconds before starting a trial', () => {
    const onTick = vi.fn();
    const onDone = vi.fn();
    const stop = runReactTrainStartCountdown({ onTick, onDone });
    expect(onTick.mock.calls.flat()).toEqual([3]);
    vi.advanceTimersByTime(2999);
    expect(onTick.mock.calls.flat()).toEqual([3, 2, 1]);
    expect(onDone).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onTick.mock.calls.flat()).toEqual([3, 2, 1, 0]);
    expect(onDone).toHaveBeenCalledOnce();
    stop();
  });

  it('cancels the countdown when the activity unmounts', () => {
    const onTick = vi.fn();
    const onDone = vi.fn();
    const stop = runReactTrainStartCountdown({ onTick, onDone });
    vi.advanceTimersByTime(1000);
    stop();
    vi.advanceTimersByTime(5000);
    expect(onTick.mock.calls.flat()).toEqual([3, 2]);
    expect(onDone).not.toHaveBeenCalled();
  });
});
