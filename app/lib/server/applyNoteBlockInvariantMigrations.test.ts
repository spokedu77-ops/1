import { describe, expect, it } from 'vitest';
import { applyNoteBlockInvariantMigrations } from './applyNoteBlockInvariantMigrations';
import type { LoadedNoteBlock } from './loadNoteDocumentBlocks';

function block(
  id: string,
  type: string,
  parent_block_id: string | null,
  order_index: number,
): LoadedNoteBlock {
  return {
    id,
    document_id: 'doc-1',
    parent_block_id,
    type,
    order_index,
    content: {},
    created_at: '2026-07-20T00:00:00.000Z',
    updated_at: '2026-07-20T00:00:00.000Z',
    deleted_at: null,
    deleted_by: null,
    version: 1,
  };
}

function supabaseMock() {
  const updates: Array<{ table: string; patch: unknown; id: string }> = [];
  return {
    updates,
    client: {
      from(table: string) {
        return {
          update(patch: unknown) {
            return {
              eq(column: string, id: string) {
                expect(column).toBe('id');
                updates.push({ table, patch, id });
                return Promise.resolve({ error: null });
              },
            };
          },
        };
      },
    },
  };
}

describe('applyNoteBlockInvariantMigrations', () => {
  it('repairs forbidden parents and duplicate sibling order during default load', async () => {
    const supabase = supabaseMock();
    const result = await applyNoteBlockInvariantMigrations(
      supabase.client as never,
      [
        block('text-parent', 'text', null, 0),
        block('child', 'todo', 'text-parent', 0),
        block('after', 'todo', null, 0),
      ],
    );

    expect(result.find((item) => item.id === 'child')?.parent_block_id).toBeNull();
    expect(result.filter((item) => !item.parent_block_id).map((item) => item.order_index)).toEqual([0, 1, 2]);
    expect(supabase.updates).toEqual(expect.arrayContaining([
      {
        table: 'note_blocks',
        id: 'child',
        patch: expect.objectContaining({ parent_block_id: null }),
      },
      {
        table: 'note_blocks',
        id: 'after',
        patch: expect.objectContaining({ order_index: 2 }),
      },
    ]));
  });

  it('does not write when the loaded tree already satisfies invariants', async () => {
    const supabase = supabaseMock();
    const result = await applyNoteBlockInvariantMigrations(
      supabase.client as never,
      [
        block('page', 'page', null, 0),
        block('todo', 'todo', 'page', 0),
        block('toggle', 'toggle', 'page', 1),
      ],
    );

    expect(result.map((item) => item.id)).toEqual(['page', 'todo', 'toggle']);
    expect(supabase.updates).toEqual([]);
  });

  it('breaks cycles conservatively by promoting affected blocks to roots', async () => {
    const supabase = supabaseMock();
    const result = await applyNoteBlockInvariantMigrations(
      supabase.client as never,
      [
        block('page-a', 'page', 'page-b', 0),
        block('page-b', 'page', 'page-a', 0),
      ],
    );

    expect(result.every((item) => item.parent_block_id === null)).toBe(true);
    expect(result.map((item) => item.order_index)).toEqual([0, 1]);
    expect(supabase.updates.length).toBeGreaterThan(0);
  });
});
