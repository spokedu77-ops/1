import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

describe('MASTER SPOMOVE pause lifecycle contract', () => {
  const page = read('app/spokedu-master/spomove/session/page.tsx');
  const router = read('app/spokedu-master/spomove/session/EngineRouter.tsx');

  it('keeps paused as a non-terminal MASTER state with manual resume', () => {
    expect(page).toContain("type SpomoveRuntimeState as SessionState");
    expect(page).toContain("runtimeStateRef.current = 'paused'");
    expect(page).toContain("runtimeStateRef.current = 'running'");
    expect(page).toContain('onClick={resumeSession}');
    expect(page).toContain("finishSession('stopped_early')");
  });

  it('auto-pauses on background and never auto-resumes on foreground', () => {
    expect(page).toContain("document.visibilityState === 'hidden'");
    expect(page).toContain("document.addEventListener('visibilitychange', pauseForBackground)");
    expect(page).toContain("window.addEventListener('pagehide', persistForPageHide)");
    expect(page).not.toContain("document.visibilityState === 'visible'");
    expect(page).not.toContain("window.addEventListener('focus', resumeSession)");
  });

  it('passes one explicit pause contract through the seven-mode EngineRouter', () => {
    expect(router).toContain("runtimeState: 'running' | 'paused'");
    expect(router).toContain("setSpomoveRuntimePaused(runtimeState === 'paused')");
    for (const mode of ['basic', 'simon', 'flanker', 'stroop', 'spatial', 'reactTrain', 'flow']) {
      expect(router).toContain(`mode === '${mode}'`);
    }
  });

  it.each([
    'MemoryGameApp.tsx',
    'components/VisualReactionTraining.tsx',
    'components/RushReactionTraining.tsx',
    'components/RobloxMoleReactionTraining.tsx',
    'components/ColorMemoryGridReactionTraining.tsx',
    'components/RelativeCompassReactionTraining.tsx',
    'flow-lab/UnityDiveThemeClient.tsx',
    'flow-lab/engine/FlowEngine.ts',
  ])('%s uses the pause-aware runtime clock', (relativePath) => {
    const source = read(`app/admin/spomove/training/_player/${relativePath}`);
    expect(source).toContain('runtimeClock');
  });

  it('pauses BGM and WebAudio until the user resumes', () => {
    expect(page).toContain('bgmPlayerRef.current?.pause()');
    expect(page).toContain('getAudioCtx()?.suspend()');
    expect(page).toContain('getAudioCtx()?.resume()');
    expect(read('app/admin/spomove/training/_player/flow-lab/engine/FlowAudio.ts'))
      .toContain('subscribeSpomoveRuntimePause');
  });
});
