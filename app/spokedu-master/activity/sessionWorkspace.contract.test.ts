import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync('app/spokedu-master/activity/page.tsx', 'utf8');
const capture = readFileSync('app/spokedu-master/activity/SessionCapturePanel.tsx', 'utf8');

describe('Session workspace structural contract', () => {
  it('keeps create schedule fields separate from existing Session schedule disclosure', () => {
    expect(source).toContain('data-session-create-schedule');
    expect(source).toContain('data-session-schedule-disclosure');
    expect(source).toContain('scheduleEditorOpen');
  });

  it('uses WorkState presentation and one ordered next pending activity', () => {
    expect(source).toContain('resolveSessionWorkspacePresentation');
    expect(source).toContain('workspace?.nextPendingProgramId');
    expect(source).toContain('다음 활동');
    expect(source).toContain('data-session-program={program.id}');
    expect(source).toContain('data-session-teach');
    expect(source).toContain('완료하고 다음으로');
    expect(source).toContain('완료하고 수업 마무리');
  });

  it('keeps explicit teacher completion and exact navigation context', () => {
    expect(source).toContain('await data.updateSessionProgram');
    expect(source).toContain('sessionProgram=${encodeURIComponent(program.id)}');
    expect(source).toContain('returnTo=${encodeURIComponent(buildActivitySessionHref(activeSession.id))}');
    expect(source).toContain('target="_blank" rel="noreferrer"');
  });

  it('only renders the wrap primary surface for WRAP or ATTENTION', () => {
    expect(source).toContain("workspace?.presentationKind === 'WRAP' || workspace?.presentationKind === 'ATTENTION'");
    expect(source).toContain('data-session-primary-action');
    expect(source).not.toContain("workState?.stage === 'ready-to-wrap' || workState?.attention.overdue ? '수업 마무리' : MASTER_ACTION_COPY.completeSession");
  });

  it('uses the continuity target before offering timeline-end creation', () => {
    expect(source).toContain('resolveSessionContinuity');
    expect(source).toContain("continuity.kind === 'existing-upcoming'");
    expect(source).toContain('다음 수업 준비');
    expect(source).toContain('다음 수업 보기');
    expect(source).toContain('openNextPlanner');
  });

  it('drives section order and capture from workspace composition', () => {
    expect(source).toContain('sessionSectionOrderClass');
    expect(source).toContain('workspace?.sectionOrder');
    expect(source).toContain('captureMode={workspace?.captureMode');
    expect(source).toContain('showInlinePremiumUpsell={Boolean(workspace?.showInlinePremiumUpsell)}');
    expect(source).toContain("workspace?.presentationKind !== 'RECOVERY'");
    expect(source).toContain('attendanceDefaultOpen');
  });

  it('keeps capture progressive by mode and hides lite gates outside wrap/review', () => {
    expect(capture).toContain("captureMode === 'memory'");
    expect(capture).toContain("captureMode === 'hidden'");
    expect(capture).toContain('showInlinePremiumUpsell');
    expect(capture).toContain('지난 수업에서 이어갈 점');
    expect(capture).toContain('오늘 관찰을 남기면 다음 준비에 이어집니다');
    expect(capture).not.toContain('presentationKind');
  });
});
