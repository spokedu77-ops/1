import { describe, expect, it } from 'vitest';

import { collectActiveSubtreeIds, enforceDocumentBlockInvariants } from './route';

describe('collectActiveSubtreeIds', () => {
  it('expands root deletes to active descendants', () => {
    expect(collectActiveSubtreeIds(['root'], [
      block('root'),
      block('child-a', { parent_block_id: 'root' }),
      block('grandchild', { parent_block_id: 'child-a' }),
      block('sibling'),
    ])).toEqual(['root', 'child-a', 'grandchild']);
  });

  it('does not include descendants that are already soft-deleted', () => {
    expect(collectActiveSubtreeIds(['root'], [
      block('root'),
      block('deleted-child', {
        parent_block_id: 'root',
        deleted_at: '2026-07-17T00:00:00.000Z',
      }),
      block('hidden-under-deleted-child', { parent_block_id: 'deleted-child' }),
    ])).toEqual(['root']);
  });

  it('dedupes overlapping roots', () => {
    expect(collectActiveSubtreeIds(['root', 'child'], [
      block('root'),
      block('child', { parent_block_id: 'root' }),
    ])).toEqual(['root', 'child']);
  });
});

describe('enforceDocumentBlockInvariants', () => {
  it('repairs sibling order drift after direct writes', async () => {
    const rows = [
      block('todo', { type: 'todo', order_index: 0 }),
      block('child', { type: 'text', order_index: 0 }),
      block('dupe', { type: 'text', order_index: 0 }),
    ];
    const updates: Array<{ id: string; patch: Record<string, unknown> }> = [];
    const supabase = {
      from(table: string) {
        expect(table).toBe('note_blocks');
        const chain = {
          select() {
            return chain;
          },
          eq() {
            return chain;
          },
          is() {
            return chain;
          },
          order() {
            return chain;
          },
          limit() {
            return Promise.resolve({ data: rows, error: null });
          },
          update(patch: Record<string, unknown>) {
            updates.push({ id: '', patch });
            return chain;
          },
          then(resolve: (value: unknown) => void) {
            resolve({ error: null });
          },
        };
        return chain;
      },
    };

    await enforceDocumentBlockInvariants(supabase as never, ['doc'], 'actor', '2026-07-21T00:00:00.000Z');

    expect(updates.map((item) => item.patch)).toEqual([
      expect.objectContaining({ order_index: 1 }),
      expect.objectContaining({ order_index: 2 }),
    ]);
  });
});

function block(id: string, overrides = {}) {
  return {
    id,
    document_id: 'doc',
    parent_block_id: null,
    type: 'text',
    order_index: 0,
    content: {},
    created_at: '2026-07-17T00:00:00.000Z',
    updated_at: '2026-07-17T00:00:00.000Z',
    deleted_at: null,
    deleted_by: null,
    version: 1,
    ...overrides,
  };
}
