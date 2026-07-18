import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const source = readFileSync(join(process.cwd(), 'app/spokedu-master/class-record/page.tsx'), 'utf8');

describe('class record entry flow contract', () => {
  it('normalizes program query variants through one helper', () => {
    expect(source).toContain('function getClassRecordQuery');
    expect(source).toContain("searchParams.get('program') ?? searchParams.get('programId')");
    expect(source).toContain("resolveSpomoveDraftFromQuery(searchParams)");
    expect(source).toContain('spomoveDraft } = getClassRecordQuery(searchParams)');
  });

  it('does not fall back to an arbitrary program for an invalid query id', () => {
    expect(source).toContain("const initialProgramId = editingRecord?.programId ?? sourceRecord?.programId ?? requestedProgramId ?? ''");
    expect(source).toContain("programs.find((item) => item.id === selectedProgramId) ?? null");
    expect(source).not.toContain("requestedProgramId ?? editingRecord?.programId ?? sourceRecord?.programId)) ?? programs[0]");
  });

  it('keeps the writing order clear on the user-facing form', () => {
    expect(source).toContain('1. 수업 정보');
    expect(source).toContain('2. 참여 학생');
    expect(source).toContain('3. 기록 내용');
    expect(source).toContain('4. 저장');
  });

  it('supports bulk student selection and selected-count feedback', () => {
    expect(source).toContain('selectedStudentIds');
    expect(source).toContain('selectedStudentCount');
    expect(source).toContain('전체 선택');
    expect(source).toContain('전체 해제');
    expect(source).toContain('applyAttendanceToSelected');
    expect(source).toContain('선택 출석');
    expect(source).toContain('선택 결석');
    expect(source).toContain('출석 초기화');
    expect(source).toContain('선택 {selectedStudentCount}명 / 전체 {students.length}명');
  });

  it('opens the student creation sheet directly when records need students', () => {
    expect(source).toContain('/spokedu-master/students?add=1');
    expect(source).not.toContain('href="/spokedu-master/students" className="inline-flex h-11');
  });

  it('saves only selected students and avoids overwriting existing per-student memo on bulk apply', () => {
    expect(source).toContain('students: selectedStudents.map');
    expect(source).toContain("if (!next[student.id]?.trim()) next[student.id] = memo");
    expect(source).toContain('전체 학생에게 적용');
  });

  it('prevents duplicate submit and preserves explicit save labels', () => {
    expect(source).toContain('if (!canSaveRecord || recordSaving) return null');
    expect(source).toContain('canAttemptOnlineSave(isOnline)');
    expect(source).toContain('SaveErrorBanner');
    expect(source).toContain('저장 중...');
    expect(source).toContain('수업 기록 수정');
    expect(source).toContain('수업 기록 저장');
    expect(source).toContain('보강 저장');
  });

  it('enriches quick records on the same record id and promotes to detailed', () => {
    expect(source).toContain('isEnrichingQuickRecord');
    expect(source).toContain("editingRecord.recordType === 'quick'");
    expect(source).toContain('enrichingEmptyRoster');
    expect(source).toContain('parentNoteSnapshot: editingRecord?.parentNoteSnapshot');
    expect(source).toContain("recordType: 'detailed'");
    expect(source).toContain('같은 기록 보강 중');
    expect(source).toContain('이 기록 보강');
  });

  it('keeps offline and expired save feedback with payment CTA wiring', () => {
    expect(source).toContain('getOfflineSaveFeedback()');
    expect(source).toContain('resolveSaveActionFeedback(caught, accessSnapshot)');
    expect(source).toContain('upgradeHref');
    expect(source).toContain('upgradeLabel');
  });

  it('persists in-progress drafts across refresh for new records', () => {
    expect(source).toContain('CLASS_RECORD_DRAFT_KEY');
    expect(source).toContain('writeSaveDraft(CLASS_RECORD_DRAFT_KEY');
    expect(source).toContain('clearSaveDraft(CLASS_RECORD_DRAFT_KEY)');
    expect(source).toContain('hasMeaningfulClassRecordDraft');
    expect(source).toContain('if (requestedProgramId && draft.selectedProgramId && draft.selectedProgramId !== requestedProgramId) return');
  });

  it('resets student observations when the selected program changes', () => {
    expect(source).toContain('수업이 바뀌면 이전 수업의 출석·관찰·메모를 새 기록에 섞지 않는다.');
    expect(source).toContain("setAttendance(Object.fromEntries(students.map((student) => [student.id, 'pending']))");
    expect(source).toContain('setFocused({})');
    expect(source).toContain('setStudentMemos({})');
  });

  it('applies SPOMOVE record drafts only to empty class memo fields', () => {
    expect(source).toContain('spomoveDraft');
    expect(source).toContain('setClassMemo((current) => current.trim() ? current : spomoveDraft)');
  });
});
