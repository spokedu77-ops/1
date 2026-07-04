import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

describe('SPOKEDU MASTER lesson CTA hierarchy', () => {
  const library = read('app/spokedu-master/library/LibraryView.tsx');
  const detail = read('app/spokedu-master/library/[id]/LibraryDetailView.tsx');

  it('keeps library cards focused on preview and compact full lesson material actions', () => {
    expect(library.match(/onClick=\{onPreview\}/g)).toHaveLength(2);
    expect(library).toContain('aria-label={`${program.title} 수업 미리보기`}');
    expect(library).toContain('mt-2 grid grid-cols-2 gap-2');
    expect(library).toContain('전체 자료 보기');
    expect(library).not.toContain('/spokedu-master/class-record?program=${program.id}');
  });

  it('keeps the library header as a compact search and filter control panel', () => {
    expect(library).toContain('조건에 맞는 수업 찾기');
    expect(library).toContain('결과 {filteredPrograms.length}개');
    expect(library).toContain('placeholder="수업명, 교구, 태그 검색"');
    expect(library).toContain("value === '참고 영상'");
    expect(library).toContain("value === 'SPOMOVE 연결'");
    expect(library).not.toContain('lg:grid-cols-[minmax(0,1fr)_420px]');
  });

  it('makes library detail the compact bridge from lesson choice to operation', () => {
    expect(detail).toContain('이 수업으로 진행하기');
    expect(detail).toContain('/spokedu-master/class-record?program=${program.id}');
    expect(detail).toContain('/spokedu-master/class-record?record=${quickSavedRecordId}&program=${program.id}');
    expect(detail).toContain('수업 기록 시작');
    expect(detail).toContain('빠른 기록');
    expect(detail).toContain('안내문 초안');
  });

  it('keeps sticky actions limited to SPOMOVE execution when available', () => {
    expect(detail).toContain('primarySpomovePreset ?');
    expect(detail).toContain('SPOMOVE 실행');
    expect(detail).not.toContain('/spokedu-master/class-mode/${program.id}');
  });

  it('keeps favorite as a compact support action instead of a preparation section', () => {
    expect(detail).not.toContain('Preparation');
    expect(detail).not.toContain('수업 준비 보조');
    expect(detail).toContain('aria-pressed={favorite}');
    expect(detail).toContain('title={favorite');
    expect(detail).toContain('이 수업으로 진행하기');
    expect(detail).toContain('빠른 기록');
    expect(detail).toContain('기존 기록 보기');
    expect(detail).not.toContain('/spokedu-master/class-tools');
  });
});
