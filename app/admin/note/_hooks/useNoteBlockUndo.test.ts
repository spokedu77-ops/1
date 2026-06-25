import { describe, expect, it } from 'vitest';
import {
  buildBlockTransactionUndoEntry,
  buildNoteHistoryInverse,
} from './useNoteBlockUndo';
import type { NoteBlock } from '../_lib/types';

function block(
  id: string,
  order_index: number,
  parent_block_id: string | null = null,
): NoteBlock {
  return {
    id,
    document_id: 'doc',
    type: 'text',
    content: { text: id },
    order_index,
    parent_block_id,
    created_at: '',
    updated_at: '',
  };
}

describe('block transaction history', () => {
  it('stores move undo as result-to-previous and redo as the exact inverse', () => {
    const before = [block('a', 0), block('b', 1)];
    const after = [block('a', 0), block('b', 0, 'a')];

    const undo = buildBlockTransactionUndoEntry(before, after, ['a', 'b']);
    expect(undo).toEqual({
      kind: 'block-transaction',
      before: after,
      after: before,
    });

    const redo = buildNoteHistoryInverse(undo!, after);
    expect(redo).toEqual({
      kind: 'block-transaction',
      before,
      after,
    });
  });

  it('represents create and delete without separate history entry kinds', () => {
    const existing = [block('a', 0)];
    const created = [...existing, block('new', 1)];
    const createUndo = buildBlockTransactionUndoEntry(
      existing,
      created,
      ['a', 'new'],
    );
    expect(createUndo?.kind).toBe('block-transaction');
    if (createUndo?.kind === 'block-transaction') {
      expect(createUndo.before.map((item) => item.id)).toEqual(['a', 'new']);
      expect(createUndo.after.map((item) => item.id)).toEqual(['a']);
    }

    const deleteUndo = buildBlockTransactionUndoEntry(
      created,
      existing,
      ['a', 'new'],
    );
    expect(deleteUndo?.kind).toBe('block-transaction');
    if (deleteUndo?.kind === 'block-transaction') {
      expect(deleteUndo.before.map((item) => item.id)).toEqual(['a']);
      expect(deleteUndo.after.map((item) => item.id)).toEqual(['a', 'new']);
    }
  });
});
