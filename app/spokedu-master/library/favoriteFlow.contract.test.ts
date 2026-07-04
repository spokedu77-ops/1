import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');
const librarySource = read('app/spokedu-master/library/LibraryView.tsx');
const previewSource = read('app/spokedu-master/components/lesson/ProgramPreviewModal.tsx');
const detailSource = read('app/spokedu-master/library/[id]/LibraryDetailView.tsx');

describe('library card and preview favorite synchronization', () => {
  it('passes the live owner-scoped favorite state and action to the modal', () => {
    expect(librarySource).toContain('favorite={isFavoriteProgram(ownerId, selected.program.id)}');
    expect(librarySource).toContain(
      'onFavorite={ownerId ? () => toggleFavoriteProgram(ownerId, selected.program.id) : undefined}',
    );
  });

  it('does not create a local favorite snapshot inside the modal', () => {
    expect(previewSource).not.toMatch(/useState\s*<*\s*boolean/);
    expect(previewSource).not.toContain('setFavorite');
  });

  it('does not close the modal when the favorite button is toggled', () => {
    expect(previewSource).toContain('onClick={onFavorite}');
    expect(previewSource).not.toContain('onClick={() => { onFavorite');
  });

  it('places preview favorite in the modal header instead of the lesson badges', () => {
    expect(previewSource).toContain('headerActions={onFavorite ?');
    expect(previewSource).toContain("title={favorite ? '즐겨찾기에서 제거' : '즐겨찾기에 추가'}");
    const badgesIndex = previewSource.indexOf('badges={');
    const footerIndex = previewSource.indexOf('footer={');
    const badgesBlock = previewSource.slice(badgesIndex, footerIndex);
    expect(badgesBlock).not.toContain('onClick={onFavorite}');
  });

  it('keeps cards driven by the same canonical selector after a modal toggle', () => {
    expect(librarySource).toContain(
      'isFavorite={(programId) => isFavoriteProgram(ownerId, programId)}',
    );
    expect(librarySource).toContain('selectLibraryBasePrograms(pool, favoriteIds, view)');
  });
});

describe('preview and detail navigation context', () => {
  it('passes the current library view into the modal and direct card detail href', () => {
    expect(librarySource).toContain('sourceLibraryView={view}');
    expect(librarySource).toContain(
      'detailHref={getLibraryProgramDetailHref(program.id, sourceLibraryView)}',
    );
  });

  it('builds the preview detail href from the limited library view prop', () => {
    expect(previewSource).toContain(
      'href={getLibraryProgramDetailHref(program.id, sourceLibraryView)}',
    );
  });
});

describe('detail favorite source of truth and return context', () => {
  it('uses canonical owner-scoped favorite selector and action', () => {
    expect(detailSource).toContain('state.isFavoriteProgram');
    expect(detailSource).toContain('state.toggleFavoriteProgram');
    expect(detailSource).not.toContain('isFavoriteByOwner');
  });

  it('uses one responsive favorite action with shared state', () => {
    expect(detailSource.match(/toggleFavoriteProgram\(ownerId, program\.id\)/g))
      .toHaveLength(1);
    expect(detailSource).toContain('aria-pressed={favorite}');
  });

  it('does not expose or mutate prior owner data when owner is unresolved', () => {
    expect(detailSource).toContain('ownerId ? state.favoriteProgramIdsByOwner[ownerId] : undefined');
    expect(detailSource).toContain('disabled={!ownerId}');
  });

  it('uses one validated return href for all library return actions', () => {
    expect(detailSource).toContain(
      "getLibraryReturnHref(searchParams.get('libraryView'))",
    );
    expect(detailSource.match(/href=\{libraryReturnHref\}/g)).toHaveLength(2);
  });
});
