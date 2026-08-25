import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (name: string) => readFileSync(join(process.cwd(), 'app/spokedu-master/spomove/session', name), 'utf8');
const page = read('page.tsx');
const start = read('StartBriefing.tsx');
const settings = read('SettingsBriefing.tsx');
const result = read('MasterSessionResult.tsx');

describe('SPOMOVE session lifecycle UX', () => {
  it('separates ready confirmation from editable settings', () => {
    expect(start).toContain('data-spm-session-ready-screen');
    expect(start).not.toContain('SPOMOVE_CUE_SPEED_OPTIONS');
    expect(start).not.toContain('onCueSecondsChange');
    expect(start).toContain('실행 시작');
    expect(start).toContain('설정 변경');
    expect(settings).toContain('data-spm-session-settings-screen');
    expect(settings).toContain('SPOMOVE_CUE_SPEED_OPTIONS');
    expect(settings).toContain('getSpomoveDifficultyOptions');
  });

  it('requires explicit confirmation before an engine exit becomes ended', () => {
    expect(page).toContain('onExit={() => setExitConfirmationOpen(true)}');
    expect(page).toContain('수업을 종료할까요?');
    expect(page).toContain('계속하기');
    expect(page).toContain("finishSession('ended')");
    expect(page).toContain("finishSession('done', payload)");
  });

  it('keeps activation fallback non-blocking and touch targets usable', () => {
    expect(page).toContain('화면은 계속 실행됩니다.');
    expect(page).toContain('일반 화면으로 실행합니다.');
    expect(page).toContain('다시 시도');
    expect(page).toContain('min-h-11');
  });

  it('shows only measured operational facts and a context-aware action hierarchy', () => {
    expect(result).toContain('sessionReturnHref');
    expect(result).toContain('수업으로 돌아가기');
    expect(result).toContain('같은 설정으로 다시 실행');
    expect(result).toContain('완료로 표시하고 수업으로');
    expect(result).toContain('실행 종료와 수업 활동 완료 기록은 별개입니다');
    expect(result).not.toContain('scheduledCompletionStatus');
    expect(result).not.toContain('오늘 느낌');
    expect(result).not.toContain('스스로 점검');
  });

  it('does not auto-PATCH SessionProgram on engine done', () => {
    const finishStart = page.indexOf('const finishSession = useCallback');
    const finishEnd = page.indexOf('const beginConfiguredSession');
    const finishBody = page.slice(finishStart, finishEnd);
    expect(finishBody).not.toContain('isCompleted');
    expect(page).toContain('markCompleteAndReturn');
  });

  it('preserves retry settings and Session/Hub return context', () => {
    expect(page).toContain('cueSeconds: effectiveCueSeconds');
    expect(page).toContain('difficulty: difficultyKind ? difficultyValue : undefined');
    expect(page).toContain('operationCandidate');
    expect(page).toContain('hubReturn: parseSpomoveHubReturnHref');
    expect(page).toContain('returnTo: origin.returnTo');
    expect(page).toContain('session: origin.sessionId');
    expect(page).toContain('parseMasterWorkReturnHref');
  });
});
