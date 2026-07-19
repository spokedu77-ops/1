import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const source = readFileSync(join(process.cwd(), 'app/spokedu-master/report/page.tsx'), 'utf8');

describe('report writing flow contract', () => {
  it('normalizes record query variants in one helper', () => {
    expect(source).toContain('function getReportQuery');
    expect(source).toContain("searchParams.get('record') ?? searchParams.get('recordId') ?? searchParams.get('from')");
    expect(source).toContain('queryRecordId');
  });

  it('only applies a record query when the owner-scoped record exists', () => {
    expect(source).toContain('classRecords.find((item) => item.id === queryRecordId)');
    expect(source).toContain('if (!record) return');
    expect(source).toContain('setSelectedRecordId(record.id)');
  });

  it('separates full-class and per-student report targets', () => {
    expect(source).toContain("type ReportTarget = 'class' | 'student'");
    expect(source).toContain('전체 수업 안내문');
    expect(source).toContain('학생별 안내문');
    expect(source).toContain('선택한 학생 1명의 기록만 사용합니다.');
  });

  it('does not include all student memos in the full-class draft', () => {
    expect(source).toContain("if (target === 'student' && studentId)");
    expect(source).toContain('buildStudentObservation(record, studentId)');
    expect(source).not.toContain('record.students.map((student) => `${student.studentName}');
  });

  it('starts record-query drafts as full-class copy while keeping a student ready for optional switch', () => {
    expect(source).toContain('const initialStudentId = record.students[0]?.studentId ?? null');
    expect(source).toContain("setTarget('class')");
    expect(source).toContain('setSelectedStudentId(initialStudentId)');
    expect(source).toContain("setGenerated(buildRecordDraft(record, 'class', null))");
  });

  it('keeps copy as the primary delivery action and save as optional archive', () => {
    expect(source).toContain('복사해서 전달');
    expect(source).toContain('보관');
    expect(source).toContain('나중에 다시 복사할 때만');
  });

  it('uses a single-column focused layout instead of a dual sidebar browser', () => {
    expect(source).toContain('max-w-3xl');
    expect(source).not.toContain('lg:grid-cols-[360px_minmax(0,1fr)]');
    expect(source).toContain('보관함');
  });

  it('prefers parentNoteSnapshot as the record draft body when present', () => {
    expect(source).toContain('const parentNote = record.parentNoteSnapshot?.trim()');
    expect(source).toContain('if (parentNote) {');
    expect(source).toContain('return parentNote;');
  });

  it('protects edited text before regenerating a draft', () => {
    expect(source).toContain('현재 수정한 안내문이 새 초안으로 교체됩니다.');
    expect(source).toContain('replaceDraft(buildRecordDraft');
  });

  it('prevents duplicate saves and exposes safe save/copy status', () => {
    expect(source).toContain("saveStatus === 'saving'");
    expect(source).toContain('보관 중...');
    expect(source).toContain('보관했습니다.');
    expect(source).toContain('복사했습니다. 카톡·문자·메일에 붙여넣으세요.');
    expect(source).toContain('자동으로 복사하지 못했습니다. 내용을 직접 선택해 복사해 주세요.');
  });

  it('blocks offline saves and maps forbidden errors to payment CTA', () => {
    expect(source).toContain('canAttemptOnlineSave(isOnline)');
    expect(source).toContain('getOfflineSaveFeedback()');
    expect(source).toContain('resolveSaveActionFeedback(caught, accessSnapshot)');
    expect(source).toContain('SaveErrorBanner');
  });

  it('restores unsaved report drafts after refresh', () => {
    expect(source).toContain('REPORT_DRAFT_KEY');
    expect(source).toContain('writeSaveDraft(REPORT_DRAFT_KEY');
    expect(source).toContain('clearSaveDraft(REPORT_DRAFT_KEY)');
    expect(source).toContain('if (queryProgramId && draft.programId && draft.programId !== queryProgramId) return');
  });

  it('clears saved context when the restored output is edited', () => {
    expect(source).toContain('setSavedOutputId(null)');
    expect(source).toContain('if (program) clearSavedContext(program.id)');
  });

  it('sends empty report users through lesson selection before record writing', () => {
    expect(source).toContain("import { RecordProgramPicker } from '../components/record/RecordProgramPicker'");
    expect(source).toContain('<RecordProgramPicker label="수업 골라 기록" />');
    expect(source).not.toContain('>수업 기록 작성</Link>');
    expect(source).not.toContain('>수업 기록 보기</Link>');
  });
});
