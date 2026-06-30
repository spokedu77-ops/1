import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

describe('SPOKEDU MASTER lesson CTA hierarchy', () => {
  const library = read('app/spokedu-master/library/LibraryView.tsx');
  const detail = read('app/spokedu-master/library/[id]/LibraryDetailView.tsx');

  it('keeps library cards focused on preview and full lesson material actions', () => {
    expect(library.match(/onClick=\{onPreview\}/g)).toHaveLength(1);
    expect(library).toContain('전체 수업 자료 보기');
    expect(library).not.toContain('/spokedu-master/class-record?program=${program.id}');
  });

  it('keeps detail sticky actions limited to execution decisions', () => {
    expect(detail).toContain('sm:grid-cols-2');
    expect(detail).toContain('/spokedu-master/class-mode/${program.id}');
    expect(detail).toContain('primarySpomovePreset ?');
    expect(detail).toContain('SPOMOVE 실행');
    expect(detail).not.toContain('sm:grid-cols-6');
  });

  it('places preparation and after-class actions outside the sticky execution area', () => {
    expect(detail).toContain('수업 준비 보조');
    expect(detail).toContain('수업 도구');
    expect(detail).toContain('즐겨찾기');
    expect(detail).toContain('수업 후 정리');
    expect(detail).toContain('빠른 수업 기록');
    expect(detail).toContain('기존 기록 보기');
  });
});
