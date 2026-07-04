import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const studentsList = readFileSync(join(process.cwd(), 'app/spokedu-master/students/page.tsx'), 'utf8');
const studentDetail = readFileSync(join(process.cwd(), 'app/spokedu-master/students/[studentId]/page.tsx'), 'utf8');
const classRecord = readFileSync(join(process.cwd(), 'app/spokedu-master/class-record/page.tsx'), 'utf8');

describe('student history flow contract', () => {
  it('exposes student detail and a single primary record CTA from the student history screen', () => {
    expect(studentsList).toContain('/spokedu-master/students/${selected.id}');
    expect(studentsList).toContain('<RecordProgramPicker label="수업 결과 기록" studentId={selected.id} />');
    expect(studentsList).toContain('학생 기록 보기');
    expect(studentsList).not.toContain('/spokedu-master/class-record?student=${student.id}');
  });

  it('renders only the current owner-scoped student from provider data', () => {
    expect(studentDetail).toContain('const student = students.find((item) => item.id === studentId) ?? null');
    expect(studentDetail).toContain('학생 기록을 찾을 수 없습니다.');
    expect(studentDetail).not.toContain('fetch(');
  });

  it('filters class records by the selected student id', () => {
    expect(studentDetail).toContain('record.students.find((item) => item.studentId === studentId)');
    expect(studentDetail).toContain('sort((a, b) => new Date(b.record.date).getTime() - new Date(a.record.date).getTime())');
    expect(studentDetail).toContain('entries.slice(0, 5)');
  });

  it('keeps unrelated student notes out of the student detail page', () => {
    expect(studentDetail).toContain('공통 메모:');
    expect(studentDetail).toContain('학생별 메모:');
    expect(studentDetail).not.toContain('records.map((record)');
  });

  it('does not infer student explanations without a safe relation', () => {
    expect(studentDetail).toContain('이 학생과 연결된 안내문이 없습니다.');
    expect(studentDetail).toContain('수업 기록을 작성한 뒤 학생별 안내문을 만들 수 있습니다.');
    expect(studentDetail).not.toContain('item.text.includes(student.name)');
  });

  it('supports student query as a default class-record selection without overriding edit restore', () => {
    expect(classRecord).toContain("studentId: searchParams.get('student') ?? searchParams.get('studentId')");
    expect(classRecord).toContain('if (!requestedStudentId || editingRecord || sourceRecord) return');
    expect(classRecord).toContain('student.id === requestedStudentId');
  });

  it('preserves student context only after a library program has been selected', () => {
    const picker = readFileSync(join(process.cwd(), 'app/spokedu-master/components/record/RecordProgramPicker.tsx'), 'utf8');
    expect(picker).toContain("studentId?: string");
    expect(picker).toContain("const params = new URLSearchParams({ program: programId })");
    expect(picker).toContain("if (studentId) params.set('student', studentId)");
    expect(picker).toContain("router.push(`/spokedu-master/class-record?${params.toString()}`)");
    expect(studentDetail).toContain('<RecordProgramPicker label="수업 골라 기록" studentId={student.id} />');
    expect(studentDetail).not.toContain('/spokedu-master/class-record?student=${student.id}');
    expect(studentDetail).not.toContain("latest ? `/spokedu-master/report?record=${latest.record.id}` : '/spokedu-master/class-record'");
    expect(studentDetail).toContain('기록 후 안내문');
  });

  it('opens the add-student sheet from add=1 with a stable focused name input', () => {
    expect(studentsList).toContain("new URLSearchParams(window.location.search).get('add') === '1'");
    expect(studentsList).toContain("url.searchParams.delete('add')");
    expect(studentsList).toContain('window.history.replaceState');
    expect(studentsList).toContain('initialFocusSelector="[data-spm-student-add-name]"');
    expect(studentsList).toContain('data-spm-student-add-name');
    expect(studentsList).toContain('data-testid="spm-student-add-name"');
    expect(studentsList).toContain('name="studentName"');
    expect(studentsList).toContain('value={newName}');
    expect(studentsList).toContain('onChange={(event) => setNewName(event.target.value)}');
  });

  it('guards student deletion against accidental taps and duplicate requests', () => {
    expect(studentsList).toContain('const handleDeleteStudent');
    expect(studentsList).toContain('window.confirm(`${student.name} 학생을 삭제할까요?');
    expect(studentsList).toContain('studentDeletingId');
    expect(studentsList).toContain('studentDeleteError');
    expect(studentsList).toContain('onClick={() => handleDeleteStudent(student)}');
    expect(studentsList).toContain('disabled={studentDeletingId === student.id}');
    expect(studentsList).not.toContain('onClick={() => { void operationalData.deleteStudent(student.id)');
  });
});
