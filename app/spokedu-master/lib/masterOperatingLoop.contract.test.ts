import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import {
  buildActivitySessionHref,
  parseMasterWorkReturnHref,
  readSpomoveSessionOrigin,
} from './masterNavigationContext';
import { isEngineDoneLessonRecord, MASTER_TRUTH_ACTIVITY_COMPLETED, MASTER_TRUTH_SPOMOVE_ENGINE_DONE } from './masterProductTruth';

describe('MASTER whole-product operating loop', () => {
  it('keeps only an internal MASTER work return', () => {
    expect(parseMasterWorkReturnHref('/spokedu-master/activity?session=s-1', null)).toBe('/spokedu-master/activity?session=s-1');
    expect(parseMasterWorkReturnHref('https://evil.example', null, null, '/spokedu-master/activity')).toBe('/spokedu-master/activity');
    expect(parseMasterWorkReturnHref('//evil.example', null, null, '/spokedu-master/activity')).toBe('/spokedu-master/activity');
    expect(buildActivitySessionHref('수업 1')).toBe('/spokedu-master/activity?session=%EC%88%98%EC%97%85%201');
  });

  it('identifies the exact scheduled SPOMOVE origin', () => {
    const params = new URLSearchParams('session=s-1&sessionProgram=sp-2&returnTo=%2Fspokedu-master%2Factivity%3Fsession%3Ds-1');
    expect(readSpomoveSessionOrigin(params)).toEqual({
      sessionId: 's-1',
      sessionProgramId: 'sp-2',
      returnTo: '/spokedu-master/activity?session=s-1',
      isSessionOrigin: true,
    });
  });

  it('SPOMOVE-SESSION-01: engine done never auto-mutates SessionProgram; teacher may mark explicitly', () => {
    expect(MASTER_TRUTH_ACTIVITY_COMPLETED).toContain('교사가');
    expect(MASTER_TRUTH_SPOMOVE_ENGINE_DONE).toContain('분리');
    expect(isEngineDoneLessonRecord(false)).toBe(true);

    const sessionPage = readFileSync('app/spokedu-master/spomove/session/page.tsx', 'utf8');
    const result = readFileSync('app/spokedu-master/spomove/session/MasterSessionResult.tsx', 'utf8');
    const provider = readFileSync('app/spokedu-master/operational/OperationalDataProvider.tsx', 'utf8');

    // Engine finish must not PATCH isCompleted.
    expect(sessionPage).toContain('finishSession');
    expect(sessionPage).toMatch(/Product truth:[\s\S]*SessionProgram completed/);
    const finishBody = sessionPage.slice(
      sessionPage.indexOf('const finishSession = useCallback'),
      sessionPage.indexOf('}, [', sessionPage.indexOf('const finishSession = useCallback')),
    );
    expect(finishBody).not.toContain('isCompleted');
    expect(finishBody).not.toContain('/programs/');

    // Explicit teacher action only.
    expect(sessionPage).toContain('markCompleteAndReturn');
    expect(sessionPage).toContain('JSON.stringify({ isCompleted: true })');
    expect(result).toContain('완료로 표시하고 수업으로');
    expect(result).toContain('수업으로 돌아가기');
    expect(result).not.toContain('scheduledCompletionStatus');

    expect(provider).toContain("window.addEventListener('focus', refreshOnReturn)");
    expect(provider).toContain("document.addEventListener('visibilitychange', refreshOnReturn)");
  });

  it('preserves general-program and tool returns to the operating Session', () => {
    const activity = readFileSync('app/spokedu-master/activity/page.tsx', 'utf8');
    const programNavigation = readFileSync('app/spokedu-master/activity/sessionProgramAvailability.ts', 'utf8');
    expect(activity).toContain('buildSessionProgramDetailHref({');
    expect(programNavigation).toContain("source: 'session'");
    expect(programNavigation).toContain('sessionProgram: input.sessionProgramId');
    expect(activity).toContain('class-tools?session=');
    expect(activity).toContain('returnTo=');
  });
});
