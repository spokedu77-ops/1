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
    const picker = read('app/spokedu-master/components/record/RecordProgramPicker.tsx');
    const detail = read('app/spokedu-master/students/[studentId]/page.tsx');
    expect(picker).toContain('/spokedu-master/activity');
    expect(detail).toContain('href="/spokedu-master/activity"');
    expect(picker).not.toContain('/spokedu-master/class-record');
  });
});
