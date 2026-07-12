import { describe, expect, it } from 'vitest';
import { noteBlocksLoadPath } from './noteBlocksLoad';

describe('noteBlocksLoadPath', () => {
  it('requests full server migration by default', () => {
    expect(noteBlocksLoadPath('doc-1')).toBe(
      '/api/admin/note/blocks/load?documentId=doc-1',
    );
  });

  it('allows explicit fast raw load for prefetch rollback', () => {
    expect(noteBlocksLoadPath('doc-1', { skipServerMigration: true })).toBe(
      '/api/admin/note/blocks/load?documentId=doc-1&skipReconcile=true',
    );
  });
});
