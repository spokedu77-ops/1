import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { canPauseSpomoveRuntime, canResumeSpomoveRuntime } from './sessionRuntimeLifecycle';

const page = readFileSync('app/spokedu-master/spomove/session/page.tsx', 'utf8');
const router = readFileSync('app/spokedu-master/spomove/session/EngineRouter.tsx', 'utf8');

describe('SPOMOVE pause lifecycle contract', () => {
  it('keeps running and paused as explicit reciprocal states', () => {
    expect(canPauseSpomoveRuntime('running')).toBe(true);
    expect(canPauseSpomoveRuntime('paused')).toBe(false);
    expect(canResumeSpomoveRuntime('paused')).toBe(true);
    expect(canResumeSpomoveRuntime('running')).toBe(false);
  });

  it('connects one running pause control to the existing pause overlay', () => {
    expect(page).toContain('onClick={pauseSession}');
    expect(page).toContain('state === \'running\'');
    expect(page).toContain('data-spomove-pause-overlay');
    expect(page).toContain('onClick={resumeSession}');
  });

  it('auto-pauses hidden sessions without a visible auto-resume handler', () => {
    expect(page).toContain("document.visibilityState === 'hidden'");
    expect(page).toContain('pauseSession();');
    expect(page).toContain("window.addEventListener('pagehide', persistForPageHide)");
    expect(page).not.toMatch(/visibilityState === ['"]visible['"][\s\S]{0,200}resumeSession/);
  });

  it('propagates pause state, audio lifecycle, and movement context', () => {
    expect(router).toContain("setSpomoveRuntimePaused(runtimeState === 'paused')");
    expect(page).toContain('suspendExistingAudioCtx()');
    expect(page).toContain('resumeExistingAudioCtx()');
    expect(page).toContain('currentMovement={');
    expect(page).toContain('onClick={openMovementSheet}');
    expect(router).toContain('<MovementHud');
  });
});
