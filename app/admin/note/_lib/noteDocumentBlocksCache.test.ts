import { describe, expect, it, beforeEach } from 'vitest';
import {
  invalidateRememberedNoteDocumentBlocks,
  readRememberedNoteDocumentBlocks,
  rememberNoteDocumentBlocks,
} from './noteDocumentBlocksCache';
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
});
