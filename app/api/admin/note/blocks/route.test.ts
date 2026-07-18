import { describe, expect, it } from 'vitest';

import { collectActiveSubtreeIds } from './route';

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
