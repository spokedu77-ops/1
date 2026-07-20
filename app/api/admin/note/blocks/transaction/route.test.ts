import { describe, expect, it } from 'vitest';

import { normalizeTransactionPayloadForInvariants } from './route';

function block(id: string, overrides = {}) {
  return {
    id,
    document_id: 'doc',
    parent_block_id: null,
    type: 'text',
    order_index: 0,
    content: {},
    created_at: '2026-07-21T00:00:00.000Z',
    updated_at: '2026-07-21T00:00:00.000Z',
    deleted_at: null,
    deleted_by: null,
    version: 1,
    ...overrides,
  };
}

describe('normalizeTransactionPayloadForInvariants', () => {
  it('promotes blocks out of forbidden parents before RPC persistence', () => {
    const result = normalizeTransactionPayloadForInvariants({
      existingBlocks: [
        block('todo', { type: 'todo', order_index: 0 }),
        block('text', { type: 'text', parent_block_id: 'todo', order_index: 0 }),
      ],
      updates: [
        { id: 'text', parent_block_id: 'todo', order_index: 0 },
      ],
      creates: [],
      deleteIds: [],
    });

    expect(result.updates[0]).toMatchObject({
      id: 'text',
      parent_block_id: null,
      order_index: 1,
    });
  });

  it('normalizes created children against the whole document tree', () => {
    const result = normalizeTransactionPayloadForInvariants({
      existingBlocks: [
        block('root', { type: 'page', order_index: 0 }),
      ],
      updates: [],
      creates: [
        { id: 'child-page', document_id: 'doc', type: 'page', parent_block_id: 'root', order_index: 99 },
        { id: 'todo-child', document_id: 'doc', type: 'todo', parent_block_id: 'child-page', order_index: 99 },
      ],
      deleteIds: [],
    });

    expect(result.creates).toEqual([
      expect.objectContaining({ id: 'child-page', parent_block_id: 'root', order_index: 0 }),
      expect.objectContaining({ id: 'todo-child', parent_block_id: 'child-page', order_index: 0 }),
    ]);
  });

  it('ignores deleted blocks when computing the persisted projection', () => {
    const result = normalizeTransactionPayloadForInvariants({
      existingBlocks: [
        block('old', { order_index: 0 }),
        block('keep', { order_index: 1 }),
      ],
      updates: [
        { id: 'keep', order_index: 10 },
      ],
      creates: [],
      deleteIds: ['old'],
    });

    expect(result.updates[0]).toMatchObject({
      id: 'keep',
      parent_block_id: null,
      order_index: 0,
    });
  });
});
