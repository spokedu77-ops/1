import { describe, expect, it } from 'vitest';

import {
  canPauseSpomoveRuntime,
  canResumeSpomoveRuntime,
  isTerminalSpomoveRuntime,
} from './sessionRuntimeLifecycle';

describe('SPOMOVE pause lifecycle', () => {
  it('allows one running to paused transition and one manual resume', () => {
    expect(canPauseSpomoveRuntime('running')).toBe(true);
    expect(canPauseSpomoveRuntime('paused')).toBe(false);
    expect(canResumeSpomoveRuntime('paused')).toBe(true);
    expect(canResumeSpomoveRuntime('running')).toBe(false);
  });

  it('does not treat pause as a terminal completion state', () => {
    expect(isTerminalSpomoveRuntime('paused')).toBe(false);
    expect(isTerminalSpomoveRuntime('done')).toBe(true);
    expect(isTerminalSpomoveRuntime('ended')).toBe(true);
  });
});
