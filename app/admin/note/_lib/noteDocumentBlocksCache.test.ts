import { describe, expect, it, beforeEach } from 'vitest';
import {
  invalidateRememberedNoteDocumentBlocks,
  readRememberedNoteDocumentBlocks,
  rememberNoteDocumentBlocks,
} from './noteDocumentBlocksCache';
import { markPendingBlockDeletes } from './noteReconcileIdle';
import type { NoteBlock } from './types';

function block(id: string, documentId = 'doc-1'): NoteBlock {
  return {
    id,
    document_id: documentId,
    parent_block_id: null,
    type: 'text',
    order_index: 0,
    content: { text: 'hello' },
    created_at: '',
    updated_at: '',
  };
}

describe('noteDocumentBlocksCache', () => {
  beforeEach(() => {
    invalidateRememberedNoteDocumentBlocks();
  });

  it('returns remembered blocks for the same document', () => {
    rememberNoteDocumentBlocks('doc-1', [block('b1')]);
    const read = readRememberedNoteDocumentBlocks('doc-1');
    expect(read).toHaveLength(1);
    expect(read?.[0].id).toBe('b1');
  });

  it('returns a clone so mutations do not leak', () => {
    rememberNoteDocumentBlocks('doc-1', [block('b1')]);
    const read = readRememberedNoteDocumentBlocks('doc-1');
    read![0].content = { text: 'changed' };
    expect(readRememberedNoteDocumentBlocks('doc-1')?.[0].content?.text).toBe('hello');
  });

  it('ignores blocks from other documents', () => {
    rememberNoteDocumentBlocks('doc-1', [block('b1', 'doc-2')]);
    expect(readRememberedNoteDocumentBlocks('doc-1')).toBeNull();
  });

  it('replaces longer cached text when incoming is shorter (deletion)', () => {
    rememberNoteDocumentBlocks('doc-1', [{
      ...block('b1'),
      content: { text: 'line one\nline two to delete' },
    }]);
    rememberNoteDocumentBlocks('doc-1', [{
      ...block('b1'),
      content: { text: 'line one' },
    }]);
    expect(readRememberedNoteDocumentBlocks('doc-1')?.[0].content?.text).toBe('line one');
  });

  it('does not resurrect blocks removed from incoming snapshot', () => {
    rememberNoteDocumentBlocks('doc-1', [block('b1'), block('b2')]);
    rememberNoteDocumentBlocks('doc-1', [block('b1')]);
    expect(readRememberedNoteDocumentBlocks('doc-1')).toHaveLength(1);
    expect(readRememberedNoteDocumentBlocks('doc-1')?.[0].id).toBe('b1');
  });

  it('remembers empty documents so revisits skip skeleton flash', () => {
    rememberNoteDocumentBlocks('doc-empty', []);
    expect(readRememberedNoteDocumentBlocks('doc-empty')).toEqual([]);
  });

  it('ignores suspicious local shrink that would poison session cache', () => {
    const many = Array.from({ length: 8 }, (_, index) => ({
      ...block(`b${index}`),
      order_index: index,
    }));
    rememberNoteDocumentBlocks('doc-1', many, { trustServer: true });
    rememberNoteDocumentBlocks('doc-1', [many[0]]);
    expect(readRememberedNoteDocumentBlocks('doc-1')).toHaveLength(8);
  });

  it('allows intentional shrink when trustServer is set', () => {
    const many = Array.from({ length: 8 }, (_, index) => ({
      ...block(`b${index}`),
      order_index: index,
    }));
    rememberNoteDocumentBlocks('doc-1', many, { trustServer: true });
    rememberNoteDocumentBlocks('doc-1', [many[0]], { trustServer: true });
    expect(readRememberedNoteDocumentBlocks('doc-1')).toHaveLength(1);
  });

  it('allows shrink while block delete is pending even without trustServer', () => {
    const many = Array.from({ length: 8 }, (_, index) => ({
      ...block(`b${index}`),
      order_index: index,
    }));
    rememberNoteDocumentBlocks('doc-1', many, { trustServer: true });
    markPendingBlockDeletes('doc-1', ['b1', 'b2', 'b3', 'b4', 'b5', 'b6', 'b7']);
    rememberNoteDocumentBlocks('doc-1', [many[0]]);
    expect(readRememberedNoteDocumentBlocks('doc-1')).toHaveLength(1);
  });
});
