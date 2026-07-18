import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(join(process.cwd(), 'app/spokedu-master/activity/page.tsx'), 'utf8');

describe('activity class record flow', () => {
  it('keeps activity as a library-result archive, not the primary lesson entry', () => {
    expect(source).toContain('/spokedu-master/library');
    expect(source).toContain('라이브러리에서 수업 고르기');
    expect(source).toContain('수업 라이브러리 열기');
    expect(source).toContain('최근 수업 기록');
    expect(source).not.toContain('<RecordProgramPicker');
    expect(source).not.toContain('최근 안내문');
    expect(source).not.toContain('/spokedu-master/plan');
    expect(source).not.toContain('/spokedu-master/director');
    expect(source).not.toContain('/spokedu-master/shop');
  });

  it('keeps student setup visible because records and class tools depend on the roster', () => {
    expect(source).toContain('/spokedu-master/students?add=1');
    expect(source).toContain('학생 추가');
    expect(source).not.toContain('내 반 명단 준비');
    expect(source).toContain('학생 명단 관리');
    expect(source).toContain('학생 이력');
  });

  it('keeps recent record cards limited to record view and explanation creation', () => {
    expect(source).toContain('/spokedu-master/class-record?record=${record.id}&program=${record.programId}');
    expect(source).toContain('/spokedu-master/report?record=${record.id}&program=${record.programId}');
    expect(source).toContain('기록 보기');
    expect(source).toContain('안내문 만들기');
    expect(source).not.toContain('class-record?from=');
  });
});
