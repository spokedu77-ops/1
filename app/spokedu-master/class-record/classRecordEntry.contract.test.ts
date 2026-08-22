import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

describe('legacy class-record entry retirement', () => {
  it('redirects every legacy record URL to the Session calendar', () => {
    const route = read('app/spokedu-master/class-record/page.tsx');
    expect(route).toContain("redirect('/spokedu-master/activity')");
    expect(route).not.toContain('RecordEntryView');
    expect(route).not.toContain('recordDate');
    expect(route).not.toContain('studentMemos');
  });

  it('removes the compatibility picker from runtime', () => {
    const students = read('app/spokedu-master/students/page.tsx');
    expect(students).not.toContain('RecordProgramPicker');
    expect(students).toContain('href="/spokedu-master/activity"');
  });
});
