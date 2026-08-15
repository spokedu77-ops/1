import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

describe('SPOKEDU MASTER lesson CTA hierarchy', () => {
  const library = read('app/spokedu-master/library/LibraryView.tsx');
  const catalogCard = read('app/spokedu-master/components/lesson/LessonCatalogCard.tsx');
  const detail = read('app/spokedu-master/library/[id]/LibraryDetailView.tsx');

  it('keeps library cards focused on preview and the detail-page CTA', () => {
    expect(catalogCard.match(/onClick=\{onPreview\}/g)).toHaveLength(1);
    expect(library).toContain('LessonCatalogCard');
    expect(library).toContain('autoplayVideo: programHasPlayableVideo(program)');
    expect(library).not.toContain('/spokedu-master/class-record?program=${program.id}');
  });

  it('uses exactly the three approved detail actions', () => {
    expect(detail).toContain('/spokedu-master/class-record?program=${program.id}');
    expect(detail).toContain('수업 기록 시작');
    expect(detail).toContain('오늘 수업으로 지정');
    expect(detail).toContain('✓ 오늘 수업 지정됨');
    expect(detail).toContain('지도안 복사');
    expect(detail.match(/data-detail-action=/g)).toHaveLength(3);
    expect(detail).not.toContain('빠른 기록');
  });

  it('does not expose SPOMOVE execution or extra operation sections', () => {
    expect(detail).not.toContain('RelatedSpomoveSection');
    expect(detail).not.toContain('getSpomoveSessionHref');
    expect(detail).not.toContain('/spokedu-master/class-mode/${program.id}');
    expect(detail).not.toContain('recentEvidenceRecords');
  });

  it('keeps favorite as a compact sticky-header action', () => {
    expect(detail).toContain('aria-pressed={favorite}');
    expect(detail).toContain('title={favorite');
    expect(detail).not.toContain('/spokedu-master/class-tools');
  });
});
