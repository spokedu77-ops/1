import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(
  join(process.cwd(), 'app/spokedu-master/library/LibraryView.tsx'),
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
  });

  it('provides an accessible bookmark button without opening preview', () => {
    expect(source).toContain('event.stopPropagation()');
    expect(source).toContain('aria-pressed={favorite}');
    expect(source).toContain("favorite ? '즐겨찾기에서 제거' : '즐겨찾기에 추가'");
  });

  it('opens preview from the media card and keeps card actions compact', () => {
    expect(source).toContain('aria-label={`${program.title} 수업 미리보기`}');
    expect(source.match(/onClick=\{onPreview\}/g)?.length).toBeGreaterThanOrEqual(2);
    expect(source).toContain('mt-2 grid grid-cols-2 gap-2');
    expect(source).toContain('전체 자료 보기');
  });

  it('keeps the library search controls compact and purpose-led', () => {
    expect(source).toContain('조건에 맞는 수업 찾기');
    expect(source).toContain('결과 {filteredPrograms.length}개');
    expect(source).toContain('placeholder="수업명, 교구, 태그 검색"');
    expect(source).toContain("setFilter(filter?.group === 'material' && filter.value === '참고 영상'");
    expect(source).toContain("setFilter(filter?.group === 'material' && filter.value === 'SPOMOVE 연결'");
    expect(source).not.toContain('lg:grid-cols-[minmax(0,1fr)_420px]');
    expect(source).not.toContain('href="/spokedu-master/spomove" className="inline-flex h-14');
  });

  it('returns the existing loading skeleton before rendering favorites empty states', () => {
    const loadingIndex = source.indexOf('if (!programsLoaded) return <LibrarySkeleton />');
    const emptyStateIndex = source.indexOf("favoritesEmptyState === 'no-favorites'");
    expect(loadingIndex).toBeGreaterThan(-1);
    expect(emptyStateIndex).toBeGreaterThan(loadingIndex);
  });
});
