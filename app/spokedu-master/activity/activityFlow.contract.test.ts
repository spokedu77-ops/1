import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(join(process.cwd(), 'app/spokedu-master/activity/page.tsx'), 'utf8');

describe('activity next preparation flow', () => {
  it('uses the latest record as preparation context without exposing memo text fields directly', () => {
    expect(source).toContain('getLatestClassPreparationSummary(records)');
    expect(source).toContain('학생 메모 ${latestPreparation.memoCount}명');
    expect(source).toContain('수행 기록 ${latestPreparation.skillCount}명');
    expect(source).toContain("latestPreparation.hasClassMemo ? ' · 수업 메모 있음' : ''");
    expect(source).not.toContain('student.memo');
  });

  it('makes lesson material the single primary action only when the program still exists', () => {
    expect(source).toContain('latestProgramExists');
    expect(source).toContain("programs.some((program) => program.id === latestPreparation.programId)");
    expect(source).toContain("latestProgramExists ? `/spokedu-master/library/${latestPreparation.programId}`");
    expect(source).toContain(": `/spokedu-master/class-record?record=${latestPreparation.recordId}`");
    expect(source).toContain("{latestProgramExists ? '전체 수업 자료 보기' : '기존 기록 보기'}");
  });

  it('keeps secondary actions to record view and explanation only', () => {
    expect(source).toContain('기존 기록 보기');
    expect(source).toContain('저장 안내문 보기');
    expect(source).toContain('안내문 작성');
    expect(source).not.toContain('class-record?from=');
  });

  it('does not duplicate the latest record in the recent record list', () => {
    expect(source).toContain('earlierRecords');
    expect(source).toContain('records.filter((record) => record.id !== latestPreparation.recordId)');
    expect(source).toContain('earlierRecords.slice(0, 3)');
  });
});
