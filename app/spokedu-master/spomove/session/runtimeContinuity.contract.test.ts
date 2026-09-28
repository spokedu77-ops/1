import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

describe('MASTER SPOMOVE runtime continuity integration', () => {
  const page = read('app/spokedu-master/spomove/session/page.tsx');

  it('creates runId only when a real new run starts and carries it to result/record', () => {
    expect(page).toContain('const nextRunId = createSpomoveRunId()');
    expect(page).toContain('runId: activeRunId');
    expect(page).toContain('sessionResult.runId');
  });

  it('checkpoints start, pause, resume, movement, background, and pagehide', () => {
    expect(page).toContain("persistActiveRun('running', activeRunId)");
    expect(page).toContain("persistActiveRun('paused')");
    expect(page).toContain("queueMicrotask(() => persistActiveRun('paused'))");
    expect(page).toContain("window.addEventListener('pagehide', persistForPageHide)");
    expect(page).toContain('2_000');
  });

  it('uses SAFE_RESTART and never advertises fake resume', () => {
    expect(page).toContain('이전 훈련이 중단되었습니다.');
    expect(page).toContain('같은 설정으로 다시 시작');
    expect(page).toContain("completionReason: 'cancelled'");
    expect(page).not.toContain('>이어하기<');
  });

  it('uses terminal receipt cleanup before rendering a terminal result', () => {
    expect(page).toContain('commitTerminalReceipt({');
    expect(page).toContain('if (!commitTerminalReceipt({');
  });
});
