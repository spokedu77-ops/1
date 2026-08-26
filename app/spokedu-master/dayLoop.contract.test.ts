import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

describe('SPOKEDU MASTER Session day loop', () => {
  it('assigns a library program to an exact Session', () => {
    const detail = read('app/spokedu-master/library/[id]/LibraryDetailView.tsx');
    const assign = read('app/spokedu-master/components/session/AssignProgramToSessionButton.tsx');
    expect(detail).toContain('AssignProgramToSessionButton');
    expect(assign).toContain('assign(session.id)');
    expect(assign).toContain('data.addSessionProgram');
    expect(assign).toContain('upcomingSessions');
    expect(assign).toContain('다른 날짜 찾기');
  });

  it('routes home operational actions to the Calendar', () => {
    const dashboard = read('app/spokedu-master/dashboard/DashboardView.tsx');
    const todaySessions = read('app/spokedu-master/dashboard/todaySessionsModel.ts');
    expect(dashboard).toContain('TodaySessionsPanel');
    expect(todaySessions).toContain('deriveMasterSessionWorkState');
    expect(todaySessions).toContain('href: workState.href');
  });

  it('keeps SPOMOVE linked to Session operation', () => {
    const draft = read('app/spokedu-master/spomove/session/spomoveRecordDraft.ts');
    expect(draft).toContain('/spokedu-master/activity?');
  });
});
