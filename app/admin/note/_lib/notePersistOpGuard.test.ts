import { describe, expect, it } from 'vitest';
import { assertPersistOpIsSafe } from './notePersistOpGuard';
import type { NotePersistOp } from './noteDocumentOps';
import type { NoteBlock } from './types';

function block(id: string, order_index: number, parent_block_id: string | null = null): NoteBlock {
  return {
    id,
    document_id: 'doc-1',
    parent_block_id,
    type: 'text',
    order_index,
    content: { text: id, html: `<p>${id}</p>` },
    created_at: '',
    updated_at: '',
    version: 1,
  };
}

describe('note persist op guard', () => {
  it('allows explicit/enter empty visible block creates', () => {
    const op: NotePersistOp = {
      type: 'createBlock',
      id: 'new',
      documentId: 'doc-1',
      blockType: 'text',
      content: { text: '', html: '<p></p>' },
      order_index: 1,
      parent_block_id: null,
      normalizeOrders: [{ id: 'b', order_index: 2 }],
      allowEmptyVisibleCreate: true,
    };

    expect(() => assertPersistOpIsSafe(op, [block('a', 0), block('b', 2), block('new', 1)]))
      .not.toThrow();
  });

  it('blocks non-user empty visible block creates', () => {
    const op: NotePersistOp = {
      type: 'createBlock',
      id: 'new',
      documentId: 'doc-1',
      blockType: 'todo',
      content: { text: '', html: '<p></p>', checked: false },
      order_index: 1,
      parent_block_id: null,
    };

    expect(() => assertPersistOpIsSafe(op, [block('a', 0)]))
      .toThrow(/non-user empty todo create/);
  });

  it('blocks writes that leave duplicate sibling order indexes', () => {
    const op: NotePersistOp = {
      type: 'patchFields',
      patches: [{ id: 'b', order_index: 0 }],
    };

    expect(() => assertPersistOpIsSafe(op, [block('a', 0), block('b', 1)]))
      .toThrow(/duplicate sibling order/);
  });

  it('blocks empty transaction creates', () => {
    const op: NotePersistOp = {
      type: 'blockTransaction',
      patches: [],
      deleteIds: [],
      creates: [{
        id: 'blank',
        document_id: 'doc-1',
        parent_block_id: null,
        type: 'bulletList',
        order_index: 1,
        content: { text: '' },
      }],
    };

    expect(() => assertPersistOpIsSafe(op, [block('a', 0)]))
      .toThrow(/empty bulletList transaction create/);
  });
});
