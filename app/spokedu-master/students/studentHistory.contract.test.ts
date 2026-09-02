import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

describe('student history after Session refactor', () => {
  it('keeps roster CRUD and reads history from sessions', () => {
    const students = read('app/spokedu-master/students/page.tsx');
    const detail = read('app/spokedu-master/students/[studentId]/page.tsx');
    expect(students).toContain('data.students.map');
    expect(students).toContain('data.sessions.filter');
    expect(detail).toContain('data.sessions');
    expect(detail).toContain("session.status !== 'completed'");
    expect(detail).toContain('classes.map((item) => item.name)');
    expect(detail).not.toContain('StudentSessionHistory');
    expect(detail).not.toContain('focused: false');
    expect(detail).not.toContain('skills: []');
    expect(students).not.toContain('classRecords');
  });

  it('routes Session history to the Session workspace', () => {
    const detail = read('app/spokedu-master/students/[studentId]/page.tsx');
    expect(detail).toContain('/spokedu-master/activity?session=');
    expect(detail).not.toContain('RecordProgramPicker');
  });

  it('keeps guidance and reusable history ahead of profile editing', () => {
    const students = read('app/spokedu-master/students/page.tsx');
    const detail = read('app/spokedu-master/students/[studentId]/page.tsx');
    expect(students).toContain('/spokedu-master/students/${student.id}');
    expect(students).toContain('학생 정보 수정');
    expect(detail).toContain('title="지도 참고"');
    expect(detail).toContain('title="수업 이력"');
    expect(detail).toContain('MasterCollectionRow');
    expect(detail).not.toContain('수업 관리 열기');
  });
});
