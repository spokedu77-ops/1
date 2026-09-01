import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const source = readFileSync(join(process.cwd(), 'app/spokedu-master/report/page.tsx'), 'utf8');
const noticeModel = readFileSync(join(process.cwd(), 'app/spokedu-master/report/parentNoticeModel.ts'), 'utf8');

describe('Session based report contract', () => {
  it('reads completed sessions rather than legacy class records', () => {
    expect(source).toContain('data.sessions');
    expect(source).toContain("session.status === 'completed'");
    expect(source).not.toContain('classRecords');
  });

  it('uses attendance, completed programs, and the class memo', () => {
    expect(source).toContain('resolveParentNotice(selected)');
    expect(noticeModel).toContain("item.status === 'present'");
    expect(noticeModel).toContain('item.isCompleted');
    expect(noticeModel).toContain('session.memo');
  });

  it('does not recreate a report or review write model', () => {
    expect(source).not.toContain('saveClassRecord');
    expect(source).not.toContain('/api/spokedu-master/reports');
  });
});
