import { describe, expect, it, vi } from 'vitest';
import { executeScheduledSessionPrimaryAction, resolveScheduledSessionPrimaryAction } from './SessionActions';

describe('SessionActions primary intent', () => {
  it.each([
    ['add-activity', null],
    ['start-session', 'start'],
    ['run-next-activity', null],
    ['wrap-session', 'complete'],
  ] as const)('%s resolves to %s', (intent, action) => {
    expect(resolveScheduledSessionPrimaryAction(false, intent)).toBe(action);
  });

  it('keeps new Session creation', () => {
    expect(resolveScheduledSessionPrimaryAction(true, null)).toBe('create');
  });

  it('calls only startSession for start-session', async () => {
    const startSession = vi.fn(async () => undefined);
    const persist = vi.fn(async () => undefined);
    await executeScheduledSessionPrimaryAction('start', startSession, persist);
    expect(startSession).toHaveBeenCalledOnce();
    expect(persist).not.toHaveBeenCalled();
  });

  it('calls only completed persistence for wrap-session', async () => {
    const startSession = vi.fn(async () => undefined);
    const persist = vi.fn(async () => undefined);
    await executeScheduledSessionPrimaryAction('complete', startSession, persist);
    expect(startSession).not.toHaveBeenCalled();
    expect(persist).toHaveBeenCalledWith('completed');
  });
});
