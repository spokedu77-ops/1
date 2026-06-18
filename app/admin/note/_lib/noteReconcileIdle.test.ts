import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  NOTE_RECONCILE_IDLE_MS,
  bumpNoteReconcileIdle,
  cancelNoteReconcileIdle,
  registerNoteReconcileIdleHandler,
} from './noteReconcileIdle';

describe('noteReconcileIdle', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    cancelNoteReconcileIdle();
    registerNoteReconcileIdleHandler(null);
    vi.useRealTimers();
  });

  it('resets idle timer on each bump (typing extends reconcile wait)', () => {
    const handler = vi.fn();
    registerNoteReconcileIdleHandler(handler);

    bumpNoteReconcileIdle('doc-a');
    vi.advanceTimersByTime(NOTE_RECONCILE_IDLE_MS - 500);
    bumpNoteReconcileIdle('doc-a');
    vi.advanceTimersByTime(NOTE_RECONCILE_IDLE_MS - 500);
    expect(handler).not.toHaveBeenCalled();

    vi.advanceTimersByTime(500);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith('doc-a');
  });

  it('ignores bump when document id is missing', () => {
    const handler = vi.fn();
    registerNoteReconcileIdleHandler(handler);
    bumpNoteReconcileIdle(null);
    vi.advanceTimersByTime(NOTE_RECONCILE_IDLE_MS);
    expect(handler).not.toHaveBeenCalled();
  });

  it('cancel clears pending reconcile', () => {
    const handler = vi.fn();
    registerNoteReconcileIdleHandler(handler);
    bumpNoteReconcileIdle('doc-a');
    cancelNoteReconcileIdle();
    vi.advanceTimersByTime(NOTE_RECONCILE_IDLE_MS);
    expect(handler).not.toHaveBeenCalled();
  });
});
