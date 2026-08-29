import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

describe('SPOKEDU MASTER lesson CTA hierarchy', () => {
  const library = read('app/spokedu-master/library/LibraryView.tsx');
  const catalogCard = read('app/spokedu-master/components/lesson/LessonCatalogCard.tsx');
  const detail = read('app/spokedu-master/library/[id]/LibraryDetailView.tsx');

  it('keeps cards focused on preview and detail', () => {
    expect(catalogCard.match(/onClick=\{onPreview\}/g)).toHaveLength(1);
    expect(library).toContain('LessonCatalogCard');
    expect(library).not.toContain('/spokedu-master/class-record?program=${program.id}');
    expect(catalogCard).toContain('primaryActionLabel');
    expect(catalogCard).toContain('onPrimaryAction');
  });

  it('assigns a program to an exact Session from detail', () => {
    expect(detail).toContain('AssignProgramToSessionButton');
    expect(detail).toContain('returnHref={fromSession ? workReturnHref : null}');
    expect(detail).toContain('/spokedu-master/activity');
    expect(detail).not.toContain('수업 일정 관리');
    expect(detail).toContain('지도안 복사');
    expect(detail).not.toContain('/spokedu-master/class-record?program=${program.id}');
    expect(detail).not.toContain('오늘 수업으로 지정');
  });

  it('keeps favorite as a compact sticky-header action', () => {
    expect(detail).toContain('aria-pressed={favorite}');
    expect(detail).not.toContain('/spokedu-master/class-tools');
  });
});
