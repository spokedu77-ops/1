import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import {
  commitTerminalReceipt,
  createSpomoveRunId,
} from './runtimeContinuity';

const page = readFileSync('app/spokedu-master/spomove/session/page.tsx', 'utf8');

describe('SPOMOVE runtime continuity integration', () => {
  it('checkpoints start, pause, resume, movement, background, and pagehide', () => {
    expect(page).toContain("persistActiveRun('running')");
    expect(page).toContain("persistActiveRun('paused')");
    expect(page).toContain('changePausedMovement');
    expect(page).toContain("document.addEventListener('visibilitychange', pauseForBackground)");
    expect(page).toContain("window.addEventListener('pagehide', persistForPageHide)");
  });

  it('uses one terminal receipt per run and new identifiers for reruns', () => {
    const first = createSpomoveRunId();
    const second = createSpomoveRunId();
    expect(first).not.toBe(second);
    const receipt = { version: 1 as const, runId: first, presetId: 'qa-preset', completionReason: 'stopped_early' as const, endedAt: 1 };
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => { values.set(key, value); },
      removeItem: (key: string) => { values.delete(key); },
    };
    expect(commitTerminalReceipt(receipt, storage)).toBe(true);
    expect(commitTerminalReceipt(receipt, storage)).toBe(false);
  });

  it('retains safe restart instead of exact engine resume', () => {
    expect(page).toContain('restartInterruptedRun');
    expect(page).toContain('createSpomoveRunId()');
    expect(page).not.toContain('resumeInterruptedRun');
  });
});
