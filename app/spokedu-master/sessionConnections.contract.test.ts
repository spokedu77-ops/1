import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

describe('MASTER Session connections', () => {
  const activity = read('app/spokedu-master/activity/page.tsx');
  const tools = read('app/spokedu-master/components/ui/ClassToolsView.tsx');
  const report = read('app/spokedu-master/report/page.tsx');

  it('opens Class tools in a new tab with the exact scheduled Session context', () => {
    expect(activity).toContain('/spokedu-master/class-tools?session=${encodeURIComponent(activeSession.id)}');
    expect(activity).toContain('target="_blank" rel="noreferrer"');
    expect(activity).toContain('수업도구');
  });

  it('locks Session-linked tools to the exact Session Class without a first-Class fallback', () => {
    expect(tools).toContain("const requestedSessionId = searchParams.get('session')");
    expect(tools).toContain("? (sessionContext?.classId ?? '')");
    expect(tools).toContain('hasSessionContext && sessionContext');
    expect(tools).toMatch(/locked\s/);
    expect(tools).toContain('수업을 찾을 수 없습니다.');
    expect(tools).toContain(": classKeys.includes(selectedClassKey) ? selectedClassKey : (classKeys[0] ?? '')");
  });

  it('links a completed Session to its exact report while keeping next Session primary', () => {
    expect(activity).toContain('/spokedu-master/report?session=${encodeURIComponent(activeSession.id)}');
    expect(activity).toContain('안내문 보기');
    expect(activity).toContain('다음 수업 만들기');
  });

  it('does not use a standalone report fallback when a Session query is explicit', () => {
    expect(report).toContain('resolveReportSession(sessions, requestedSessionId, selectedId)');
    expect(report).toContain('완료된 수업을 찾을 수 없습니다.');
    expect(report).not.toContain('sessions.find((session) => session.id === selectedId) ?? sessions[0]');
    expect(report).toContain('{!requestedSessionId ? (');
    expect(report).toContain('<label className="text-xs font-black text-slate-600">');
  });
});
