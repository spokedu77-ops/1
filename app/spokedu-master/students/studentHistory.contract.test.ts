import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

describe('student history after Session refactor', () => {
  it('keeps roster CRUD and reads history from sessions', () => {
    const students = read('app/spokedu-master/students/page.tsx');
    expect(students).toContain('operationalData.students');
    expect(students).toContain('operationalData.sessions');
    expect(students).not.toContain('operationalData.classRecords');
  });

  it('routes new operational work to the Calendar', () => {
    const detail = read('app/spokedu-master/students/[studentId]/page.tsx');
    expect(detail).toContain('href="/spokedu-master/activity"');
    expect(detail).not.toContain('RecordProgramPicker');
  });
});
