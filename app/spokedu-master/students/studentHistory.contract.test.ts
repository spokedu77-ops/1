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
    expect(detail).toContain('/spokedu-master/classes/${item.id}');
    expect(detail).not.toContain('StudentSessionHistory');
    expect(detail).not.toContain('focused: false');
    expect(detail).not.toContain('skills: []');
    expect(students).not.toContain('classRecords');
  });

  it('routes new operational work to the Calendar', () => {
    const detail = read('app/spokedu-master/students/[studentId]/page.tsx');
    expect(detail).toContain('href="/spokedu-master/activity"');
    expect(detail).not.toContain('RecordProgramPicker');
  });

  it('keeps guidance and reusable history ahead of profile editing', () => {
    const students = read('app/spokedu-master/students/page.tsx');
    const detail = read('app/spokedu-master/students/[studentId]/page.tsx');
    expect(students).toContain('학생 기록 보기');
    expect(students).toContain('학생 정보 수정');
    expect(detail).toContain('반복 지도 참고');
    expect(detail).toContain('소속 반 수업 이어가기');
    expect(detail).not.toContain('수업 관리 열기');
  });
});
