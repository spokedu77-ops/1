import { describe, expect, it } from 'vitest';

import { softDeleteBlocksForDocument } from './route';

describe('softDeleteBlocksForDocument', () => {
  it('soft-deletes only active blocks in the deleted document', async () => {
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
                return {
                  is(column: string, value: unknown) {
                    calls.push(['is', column, value]);
                    return {
                      select(columns: string) {
                        calls.push(['select', columns]);
                        return Promise.resolve({ data: [{ id: 'block-1' }, { id: 'block-2' }], error: null });
                      },
                    };
                  },
                };
              },
            };
          },
        };
      },
    };

    await expect(softDeleteBlocksForDocument(
      supabase as never,
      'doc-1',
      'user-1',
      '2026-07-17T00:00:00.000Z',
    )).resolves.toBe(2);

    expect(calls).toEqual([
      ['from', 'note_blocks'],
      ['update', {
        deleted_at: '2026-07-17T00:00:00.000Z',
        deleted_by: 'user-1',
        updated_at: '2026-07-17T00:00:00.000Z',
        updated_by: 'user-1',
      }],
      ['eq', 'document_id', 'doc-1'],
      ['is', 'deleted_at', null],
      ['select', 'id'],
    ]);
  });
});
