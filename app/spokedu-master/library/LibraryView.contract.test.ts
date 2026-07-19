import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(
  join(process.cwd(), 'app/spokedu-master/library/LibraryView.tsx'),
  'utf8',
);
const catalogCard = readFileSync(
  join(process.cwd(), 'app/spokedu-master/components/lesson/LessonCatalogCard.tsx'),
  'utf8',
);

describe('LibraryView favorites contract', () => {
  it('uses the owner-scoped canonical selectors and action', () => {
    expect(source).toContain('state.getFavoriteProgramIds');
    expect(source).toContain('state.isFavoriteProgram');
    expect(source).toContain('state.toggleFavoriteProgram');
    expect(source).not.toContain("ownerId = 'local'");
  });

  it('keeps one ProgramCard implementation for both views', () => {
    expect(source.match(/function ProgramCard\(/g)).toHaveLength(1);
    expect(source.match(/<ProgramGrid/g)).toHaveLength(1);
    expect(source).toContain('LessonCatalogCard');
  });

  it('provides an accessible bookmark button without opening preview', () => {
    expect(catalogCard).toContain('event.stopPropagation()');
    expect(catalogCard).toContain('aria-pressed={favorite}');
    expect(catalogCard).toContain("favorite ? '즐겨찾기에서 제거' : '즐겨찾기에 추가'");
  });

  it('opens preview from the media card and keeps one full-lesson CTA', () => {
    expect(catalogCard).toContain('aria-label={`${title} 수업 미리보기`}');
    expect(catalogCard.match(/onClick=\{onPreview\}/g)).toHaveLength(1);
    expect(catalogCard).not.toMatch(/>\s*수업 미리보기\s*</);
    expect(catalogCard).toContain('자료 보기');
    expect(catalogCard).not.toContain('전체 수업 자료 보기');
    expect(source).toContain('autoplayVideo: programHasPlayableVideo(program)');
    expect(source).toContain('전체 수업 자료 보기');
  });

  it('keeps the library search controls compact and purpose-led', () => {
    expect(source).toContain('조건에 맞는 수업 찾기');
    expect(source).toContain('결과 {filteredPrograms.length}개');
    expect(source).toContain('placeholder="수업명 검색"');
    expect(source).toContain('return program.title.toLowerCase()');
    expect(source).not.toContain('MATERIAL_VIDEO_VALUE');
    expect(source).not.toContain('MATERIAL_SPOMOVE_VALUE');
    expect(source).not.toContain('lg:grid-cols-[minmax(0,1fr)_420px]');
    expect(source).not.toContain('href="/spokedu-master/spomove" className="inline-flex h-14');
  });

  it('does not expose record cloning as a default library action', () => {
    expect(source).not.toContain('class-record?from=');
    expect(source).toContain('class-record?record=${record.id}&program=${program.id}');
    expect(source).toContain('기록 보기');
  });

  it('returns the existing loading skeleton before rendering favorites empty states', () => {
    const loadingIndex = source.indexOf('if (!programsLoaded) return <LibrarySkeleton />');
    const emptyStateIndex = source.indexOf("favoritesEmptyState === 'no-favorites'");
    expect(loadingIndex).toBeGreaterThan(-1);
    expect(emptyStateIndex).toBeGreaterThan(loadingIndex);
  });
});
