import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { readSessionDetailSource } from './manage/session-detailTestSource';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

describe('MASTER Session connections', () => {
  const activity = readSessionDetailSource();
  const tools = read('app/spokedu-master/components/ui/ClassToolsView.tsx');
  const report = read('app/spokedu-master/report/page.tsx');

  it('keeps Class tools out of the simplified Manage detail', () => {
    expect(activity).not.toContain('/spokedu-master/class-tools?session=');
    expect(activity).not.toContain('수업도구');
  });

  it('locks Session-linked tools to the exact Session Class without a first-Class fallback', () => {
    expect(tools).toContain("const requestedSessionId = searchParams.get('session')");
    expect(tools).toContain("? (sessionContext?.classId ?? '')");
    expect(tools).toContain('hasSessionContext && sessionContext');
    expect(tools).toMatch(/locked\s/);
    expect(tools).toContain('수업을 찾을 수 없습니다.');
    expect(tools).toContain(": classKeys.includes(selectedClassKey) ? selectedClassKey : (classKeys[0] ?? '')");
  });

  it('keeps report and next-session cascades out of Manage primary UX', () => {
    expect(activity).not.toContain('/spokedu-master/report?session=');
    expect(activity).not.toContain('다음 수업 만들기');
  });

  it('does not use a standalone report fallback when a Session query is explicit', () => {
    expect(report).toContain('resolveReportSession(sessions, requestedSessionId, selectedId)');
    expect(report).toContain('완료된 수업을 찾을 수 없습니다.');
    expect(report).not.toContain('sessions.find((session) => session.id === selectedId) ?? sessions[0]');
    expect(report).toContain('{!requestedSessionId ? (');
    expect(report).toContain('<label className="text-[13px] font-medium text-slate-600">');
  });
});
