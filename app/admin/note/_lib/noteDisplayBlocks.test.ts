import { beforeEach, describe, expect, it } from 'vitest';
import { selectDocumentBlocks, useNoteBlockStore } from '../_store/noteBlockStore';
import type { NoteBlock } from './types';

function block(id: string, documentId: string, type: NoteBlock['type'] = 'text'): NoteBlock {
  return {
    id,
    document_id: documentId,
    parent_block_id: null,
    type,
    order_index: 0,
    content: type === 'todo' ? { text: id, checked: false } : { text: id },
    created_at: '2026-07-09T00:00:00Z',
    updated_at: '2026-07-09T00:00:00Z',
  };
}

describe('selectDocumentBlocks (SSOT UI projection)', () => {
  beforeEach(() => {
    useNoteBlockStore.getState().replaceBlocks([]);
    useNoteBlockStore.getState().setActiveDocumentId(null);
  });

  it('returns only blocks for the requested document', () => {
    useNoteBlockStore.getState().replaceBlocks([
      block('a', 'doc-a'),
      block('b', 'doc-b'),
    ]);
    const result = selectDocumentBlocks(useNoteBlockStore.getState(), 'doc-a');
    expect(result.map((row) => row.id)).toEqual(['a']);
  });

  it('reflects store typing without separate React state', () => {
    const child = block('c1', 'child-doc');
    useNoteBlockStore.getState().setActiveDocumentId('child-doc');
    useNoteBlockStore.getState().replaceBlocks([child]);
    useNoteBlockStore.getState().patchContent('c1', { text: '하위 타이핑', html: '<p>하위 타이핑</p>' });

    const result = selectDocumentBlocks(useNoteBlockStore.getState(), 'child-doc');
    expect((result[0].content as { text: string }).text).toBe('하위 타이핑');
  });

  it('child open uses store only — parent blocks removed by replaceBlocks', () => {
    const child = block('c1', 'child-doc');
    useNoteBlockStore.getState().setActiveDocumentId('child-doc');
    useNoteBlockStore.getState().replaceBlocks([child]);

    const result = selectDocumentBlocks(useNoteBlockStore.getState(), 'child-doc');
    expect(result.map((row) => row.id)).toEqual(['c1']);
    expect(useNoteBlockStore.getState().getBlock('p1')).toBeUndefined();
  });
});
