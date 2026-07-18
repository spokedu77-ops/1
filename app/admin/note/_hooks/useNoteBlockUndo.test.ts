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

  it('keeps document ids in transaction snapshots for cross-document undo', () => {
    const before = [
      { ...block('root', 0), document_id: 'source' },
      { ...block('child', 0, 'root'), document_id: 'source' },
    ];
    const after = before.map((item) => ({
      ...item,
      document_id: 'target',
      parent_block_id: item.id === 'root' ? null : item.parent_block_id,
    }));

    const undo = buildBlockTransactionUndoEntry(before, after, ['root', 'child']);

    expect(undo?.kind).toBe('block-transaction');
    if (undo?.kind === 'block-transaction') {
      expect(undo.before.map((item) => item.document_id)).toEqual(['target', 'target']);
      expect(undo.after.map((item) => item.document_id)).toEqual(['source', 'source']);
    }
  });

  it('keeps todo, toggle children, and page-link metadata in cross-document undo snapshots', () => {
    const before: NoteBlock[] = [
      {
        ...block('todo', 0),
        document_id: 'source',
        type: 'todo',
        content: { text: '7.20 월요일 11시 강승현 면접', checked: false },
      },
      {
        ...block('toggle', 1),
        document_id: 'source',
        type: 'toggle',
        content: { title: 'P0 핵심 과제', collapsed: true },
      },
      {
        ...block('toggle-child', 0, 'toggle'),
        document_id: 'source',
        content: { text: '토글 자식 내용', html: '<p>토글 자식 내용</p>' },
      },
      {
        ...block('page-link', 2),
        document_id: 'source',
        type: 'page',
        content: { title: '최지훈 업무노트 하위페이지', page_document_id: 'child-doc-1' },
      },
    ];
    const after = before.map((item) => ({
      ...item,
      document_id: 'target',
      parent_block_id: item.id === 'toggle-child' ? 'toggle' : null,
    }));

    const undo = buildBlockTransactionUndoEntry(
      before,
      after,
      ['todo', 'toggle', 'toggle-child', 'page-link'],
    );

    expect(undo?.kind).toBe('block-transaction');
    if (undo?.kind !== 'block-transaction') return;
    expect(undo.after).toEqual(before);
    expect(undo.before).toEqual(after);

    const redo = buildNoteHistoryInverse(undo, before);
    expect(redo).toEqual({
      kind: 'block-transaction',
      before,
      after,
    });
  });

  it('records paste transactions as one reversible before/after timeline entry', () => {
    const before = [
      block('anchor', 0),
    ];
    const after = [
      { ...block('anchor', 0), content: { text: 'first pasted line' } },
      block('pasted-2', 1),
      block('pasted-3', 2),
    ];

    const undo = buildBlockTransactionUndoEntry(
      before,
      after,
      ['anchor', 'pasted-2', 'pasted-3'],
    );

    expect(undo).toEqual({
      kind: 'block-transaction',
      before: after,
      after: before,
    });
    const redo = buildNoteHistoryInverse(undo!, before);
    expect(redo).toEqual({
      kind: 'block-transaction',
      before,
      after,
    });
  });
});
