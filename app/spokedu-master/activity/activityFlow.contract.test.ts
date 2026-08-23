import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync('app/spokedu-master/activity/page.tsx', 'utf8');

describe('activity Session flow', () => {
  it('makes Calendar the primary Session entry', () => {
    expect(source).toContain('수업 운영 캘린더');
    expect(source).toContain('수업 추가');
    expect(source).toContain('수업 상세');
    expect(source).not.toContain('RecordProgramPicker');
  });

  it('uses the existing class roster for Session attendance', () => {
    expect(source).toContain('data.students.filter');
    expect(source).toContain("'present' | 'absent'");
    expect(source).not.toContain('observationScore');
  });

  it('keeps Session and program completion independent', () => {
    expect(source).toContain('data.updateSessionProgram');
    expect(source).toContain("void persist('completed')");
    expect(source).toContain('아직 수업 활동이 없습니다');
  });

  it('keeps unsaved field work in place while opening activity references', () => {
    expect(source).toContain('target="_blank" rel="noreferrer"');
    expect(source).toContain('새 탭에서 보기');
    expect(source).toContain('새 탭에서 실행');
  });

  it('saves scheduled attendance before committing completion', () => {
    const attendanceIndex = source.indexOf('await data.saveSessionAttendance(prepared.id');
    const completionIndex = source.indexOf("data.saveSession(sessionInput('completed')");
    expect(attendanceIndex).toBeGreaterThanOrEqual(0);
    expect(completionIndex).toBeGreaterThan(attendanceIndex);
  });

  it('keeps field controls touchable and makes completion the single primary action', () => {
    expect(source).toContain('min-h-11 rounded-lg px-3');
    expect(source).toContain('aria-label={`${index + 1}번째 활동`}');
    expect(source).toContain('h-12 w-full items-center justify-center');
    expect(source).toContain('수업 완료</button>');
  });
});
