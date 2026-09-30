import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

describe('SPOMOVE result to MASTER record handoff', () => {
  it('hydrates the activity create flow with program, draft, and run identity', () => {
    const manage = read('app/spokedu-master/manage/ManageView.tsx');
    const sheet = read('app/spokedu-master/manage/session-detail/SessionDetailSheet.tsx');
    const draft = read('app/spokedu-master/manage/session-detail/useSessionDraft.ts');
    const activities = read('app/spokedu-master/manage/session-detail/useSessionActivities.ts');
    expect(manage).toContain('resolveSpomoveRecordHandoff(searchParams, profile?.id)');
    expect(manage).toContain('spomoveHandoff?.runId');
    expect(sheet).toContain('initialMemo: spomoveHandoff?.draft');
    expect(sheet).toContain('initialProgramId: spomoveHandoff?.programId');
    expect(draft).toContain("canUseRecords ? initialMemo ?? '' : ''");
    expect(activities).toContain('program.id === initialProgramId');
  });
});
