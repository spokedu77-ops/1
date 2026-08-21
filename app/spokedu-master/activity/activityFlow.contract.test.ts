import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync('app/spokedu-master/activity/page.tsx', 'utf8');

describe('activity Session flow', () => {
  it('makes Calendar the primary Session entry', () => {
    expect(source).toContain('Session Calendar');
    expect(source).toContain('수업 추가');
    expect(source).toContain('Session 상세');
    expect(source).not.toContain('RecordProgramPicker');
  });

  it('uses the existing class roster for Session attendance', () => {
    expect(source).toContain('data.students.filter');
    expect(source).toContain("'present' | 'absent'");
    expect(source).not.toContain('observationScore');
  });

  it('keeps Session and program completion independent', () => {
    expect(source).toContain('isCompleted: !item.isCompleted');
    expect(source).toContain("void persist('completed')");
    expect(source).toContain('프로그램 미지정');
  });
});
