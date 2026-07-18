import { describe, expect, it } from 'vitest';

import {
  collectRestoreParentDetachIds,
  collectRestoreSubtreeIds,
} from './route';

describe('block trash restore planning', () => {
  it('restores descendants from the same delete batch', () => {
    expect(collectRestoreSubtreeIds('root', [
      block('root', { deleted_at: 'same' }),
      block('child', { parent_block_id: 'root', deleted_at: 'same' }),
      block('grandchild', { parent_block_id: 'child', deleted_at: 'same' }),
    ])).toEqual(['root', 'child', 'grandchild']);
  });

  it('keeps restored children attached to live or restoring parents', () => {
    expect(collectRestoreParentDetachIds(['root', 'child'], [
      block('live-parent'),
      block('root', { parent_block_id: 'live-parent', deleted_at: 'same' }),
      block('child', { parent_block_id: 'root', deleted_at: 'same' }),
    ])).toEqual([]);
  });

  it('detaches restored roots whose parent is missing or still deleted', () => {
    expect(collectRestoreParentDetachIds(['child-a', 'child-b'], [
      block('deleted-parent', { deleted_at: 'older' }),
      block('child-a', { parent_block_id: 'deleted-parent', deleted_at: 'same' }),
      block('child-b', { parent_block_id: 'missing-parent', deleted_at: 'same' }),
    ])).toEqual(['child-a', 'child-b']);
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
