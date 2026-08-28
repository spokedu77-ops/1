import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync('app/spokedu-master/activity/page.tsx', 'utf8');

describe('activity Session flow', () => {
  it('makes Calendar the primary Session entry', () => {
    expect(source).toContain('수업 관리');
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
    expect(source).toContain('오늘 할 활동을 하나 추가해 주세요.');
  });

  it('preserves exact Session context for activity preparation and SPOMOVE execution', () => {
    expect(source).toContain('target="_blank" rel="noreferrer"');
    expect(source).toContain('sessionProgram=${encodeURIComponent(program.id)}');
    expect(source).toContain('returnTo=${encodeURIComponent(buildActivitySessionHref(activeSession.id))}');
    expect(source).toContain("sessionProgram: program.id");
  });

  it('commits final fields, attendance, and completion through one command', () => {
    expect(source).toContain("data.completeSession(activeSession.id, sessionInput('completed'), attendanceInput())");
    expect(source).toContain('const captureSaved = await captureRef.current?.save() ?? true');
    expect(source).toContain("if (!captureSaved) throw new Error('수업 기록을 저장하지 못했습니다.')");
    expect(source).not.toContain('await data.saveSessionAttendance(prepared.id');
  });

  it('keeps field controls touchable and derives completion meaning from WorkState', () => {
    expect(source).toContain('min-h-11 rounded-lg px-3');
    expect(source).toContain('aria-label={`${index + 1}번째 활동`}');
    expect(source).toContain('deriveMasterSessionWorkState');
    expect(source).toContain("workspace?.presentationKind === 'WRAP'");
    expect(source).toContain('수업 마무리');
  });
});
