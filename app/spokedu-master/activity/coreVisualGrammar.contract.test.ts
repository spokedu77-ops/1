import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const activity = readFileSync('app/spokedu-master/activity/page.tsx', 'utf8');
const capture = readFileSync('app/spokedu-master/activity/SessionCapturePanel.tsx', 'utf8');
const ui = readFileSync('app/spokedu-master/lib/masterUiClasses.ts', 'utf8');

describe('Phase 9A core visual grammar', () => {
  it('uses narrow journey roles for spacing, headings, and metadata', () => {
    expect(ui).toContain('SPM_JOURNEY_STACK');
    expect(ui).toContain('SPM_JOURNEY_SURFACE');
    expect(ui).toContain('SPM_JOURNEY_HEADING');
    expect(ui).toContain('SPM_JOURNEY_META');
    expect(activity).toContain('className={SPM_JOURNEY_STACK}');
    expect(activity).not.toContain('SPM_JOURNEY_SURFACE');
  });

  it('keeps PREP activities as rows instead of nested cards', () => {
    const activityList = activity.slice(activity.indexOf("workspace?.presentationKind === 'RUN'"), activity.indexOf('<SessionCapturePanel'));
    expect(activityList).toContain('border-b border-slate-200');
    expect(activityList).not.toContain("border-emerald-300 bg-emerald-50/40");
  });

  it('keeps reuse memory neutral and capture fields quiet', () => {
    const memoryStart = capture.lastIndexOf("if (captureMode === 'memory')");
    const memory = capture.slice(memoryStart, capture.indexOf("if (captureMode === 'emphasized')", memoryStart));
    expect(memory).toContain('rounded-xl bg-slate-50');
    expect(memory).not.toContain('SPM_JOURNEY_SURFACE');
    expect(memory).not.toContain('border-emerald');
    expect(capture).toContain('SPM_JOURNEY_FIELD');
  });
});
