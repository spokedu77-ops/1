import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const readSource = (relativePath: string) =>
  fs.readFileSync(path.join(root, relativePath), 'utf8');

describe('student P0 guards', () => {
  it('keeps legacy operational student and record actions out of the active Store', () => {
    const source = readSource('app/spokedu-master/store/index.ts');

    expect(source).not.toContain('addStudent:');
    expect(source).not.toContain('removeStudent:');
    expect(source).not.toContain('saveClassRecord:');
    expect(source).not.toContain('saveQuickClassRecord:');
    expect(source).not.toContain('students: state.students');
    expect(source).not.toContain('classRecords: state.classRecords');
  });

  it('does not expose student data from the blocked parent route', () => {
    const source = readSource('app/spokedu-master/parent/[studentId]/page.tsx');

    expect(source).toContain('현재 공유 링크는 사용할 수 없습니다.');
    expect(source).not.toContain('useMasterStore');
    expect(source).not.toContain('validateParentShareToken');
    expect(source).not.toContain('student.name');
    expect(source).not.toContain('classRecords');
  });

  it('does not render parent share link creation controls', () => {
    const studentsSource = readSource('app/spokedu-master/students/page.tsx');
    const recordsSource = readSource('app/spokedu-master/class-record/page.tsx');

    expect(studentsSource).not.toContain('createParentShareToken');
    expect(studentsSource).not.toContain('보호자 링크 복사');
    expect(recordsSource).not.toContain('createParentShareToken');
    expect(recordsSource).not.toContain('보호자 링크 미리보기');
  });

  it('does not calculate director attendance from student profile percentages', () => {
    const source = readSource('app/spokedu-master/director/page.tsx');

    expect(source).not.toContain('student.attendance');
    expect(source).not.toContain('평균 출석률');
    expect(source).toContain('getClassRecordFacts(records)');
  });
});
