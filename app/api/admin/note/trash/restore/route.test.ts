import { describe, expect, it } from 'vitest';

import { restoreBlocksForDocumentDelete } from './route';

describe('restoreBlocksForDocumentDelete', () => {
  it('restores only blocks deleted in the same document delete batch', async () => {
    const calls: unknown[] = [];
    const supabase = {
      from(table: string) {
        calls.push(['from', table]);
        return {
          update(values: unknown) {
            calls.push(['update', values]);
            return {
              eq(column: string, value: unknown) {
                calls.push(['eq', column, value]);
                return this;
              },
              select(columns: string) {
                calls.push(['select', columns]);
                return Promise.resolve({ data: [{ id: 'block-1' }], error: null });
              },
            };
          },
        };
      },
    };

    await expect(restoreBlocksForDocumentDelete(
      supabase as never,
      'doc-1',
      '2026-07-17T00:00:00.000Z',
      'user-1',
      '2026-07-17T00:01:00.000Z',
    )).resolves.toBe(1);

    expect(calls).toEqual([
      ['from', 'note_blocks'],
      ['update', {
        deleted_at: null,
        deleted_by: null,
        updated_at: '2026-07-17T00:01:00.000Z',
        updated_by: 'user-1',
      }],
      ['eq', 'document_id', 'doc-1'],
      ['eq', 'deleted_at', '2026-07-17T00:00:00.000Z'],
      ['select', 'id'],
    ]);
  });

  it('does nothing when the document is not deleted', async () => {
    const supabase = {
      from() {
        throw new Error('should not query note_blocks');
      },
    };

    await expect(restoreBlocksForDocumentDelete(
      supabase as never,
      'doc-1',
      null,
      'user-1',
      '2026-07-17T00:01:00.000Z',
    )).resolves.toBe(0);
  });
});
