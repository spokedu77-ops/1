import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

describe('SPOKEDU MASTER Session day loop', () => {
  it('assigns a library program to an exact Session', () => {
    const detail = read('app/spokedu-master/library/[id]/LibraryDetailView.tsx');
    const assign = read('app/spokedu-master/components/session/AssignProgramToSessionButton.tsx');
    expect(detail).toContain('AssignProgramToSessionButton');
    expect(assign).toContain('assign(session.id)');
    expect(assign).toContain('data.saveSession');
  });

  it('routes home operational actions to the Calendar', () => {
    const dashboard = read('app/spokedu-master/dashboard/DashboardView.tsx');
    const ops = read('app/spokedu-master/dashboard/CompactOpsBar.tsx');
    expect(dashboard).toContain('/spokedu-master/activity');
    expect(ops).toContain('href="/spokedu-master/activity"');
  });

  it('keeps SPOMOVE linked to Session operation', () => {
    const draft = read('app/spokedu-master/spomove/session/spomoveRecordDraft.ts');
    expect(draft).toContain('/spokedu-master/activity?');
  });
});
