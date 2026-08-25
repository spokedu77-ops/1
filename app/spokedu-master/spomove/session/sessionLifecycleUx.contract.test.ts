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
    expect(result).toContain('수행 능력을 자동 채점한 결과가 아닙니다.');
    expect(result).toContain('수업 기록 남기기');
    expect(result).toContain('같은 설정으로 다시 실행');
    expect(result).toContain('활동 목록으로');
    expect(result).not.toContain('오늘 느낌');
    expect(result).not.toContain('스스로 점검');
  });

  it('preserves retry settings and the full Hub return query', () => {
    expect(page).toContain('cueSeconds: effectiveCueSeconds');
    expect(page).toContain('difficulty: difficultyKind ? difficultyValue : undefined');
    expect(page).toContain('operationCandidate');
    expect(page).toContain('hubReturn: parseSpomoveHubReturnHref');
  });
});
