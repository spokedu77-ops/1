import { describe, expect, it, beforeEach } from 'vitest';
import { useNoteBlockStore } from '../_store/noteBlockStore';
import type { NoteBlock } from '../_lib/types';

const block = (
  id: string,
  type: NoteBlock['type'],
  content: Record<string, unknown>,
  documentId = 'doc',
): NoteBlock => ({
  id,
  document_id: documentId,
  type,
  content,
  order_index: 0,
  parent_block_id: null,
  created_at: '',
  updated_at: '',
});

describe('syncBlocksStructure list type change', () => {
  beforeEach(() => {
    useNoteBlockStore.getState().setActiveDocumentId('doc');
    useNoteBlockStore.getState().hydrate([]);
  });

  it('does not keep stale text-block "-" when incoming type is bulletList', () => {
    useNoteBlockStore.getState().hydrate([
      block('a', 'text', { text: '-', html: '<p>-</p>' }),
    ]);
    useNoteBlockStore.getState().patchContent('a', { text: '-', html: '<p>-</p>' });

    useNoteBlockStore.getState().syncBlocksStructure([
      block('a', 'bulletList', { text: '' }),
    ]);

    const stored = useNoteBlockStore.getState().getBlock('a');
    expect(stored?.type).toBe('bulletList');
    expect(stored?.content?.text).toBe('');
    expect(stored?.content?.html).toBeUndefined();
  });

  it('keeps incoming title while preserving store text', () => {
    useNoteBlockStore.getState().hydrate([
      block('t', 'toggle', { title: '', body: 'old' }),
    ]);
    useNoteBlockStore.getState().setActiveEditor({ blockId: 't', field: 'body' });
    useNoteBlockStore.getState().patchContent('t', { title: '', body: 'typed' });

    useNoteBlockStore.getState().syncBlocksStructure([
      block('t', 'toggle', { title: '제목', body: 'old' }),
    ]);

    const stored = useNoteBlockStore.getState().getBlock('t');
    expect(stored?.content?.title).toBe('제목');
    expect(stored?.content?.body).toBe('typed');
  });

  it('does not revive stale inactive store content during structure sync', () => {
    useNoteBlockStore.getState().hydrate([
      block('a', 'text', { text: 'old local' }),
    ]);
    useNoteBlockStore.getState().patchContent('a', { text: 'stale inactive store' });
    useNoteBlockStore.getState().setActiveEditor(null);

    useNoteBlockStore.getState().syncBlocksStructure([
      block('a', 'text', { text: 'server canonical' }),
    ]);

    expect(useNoteBlockStore.getState().getBlock('a')?.content?.text).toBe('server canonical');
  });

  it('persists title-only patchContent updates', () => {
    useNoteBlockStore.getState().hydrate([
      block('t', 'toggle', { title: '', body: 'body' }),
    ]);
    useNoteBlockStore.getState().patchContent('t', { title: '새 제목', body: 'body' });

    expect(useNoteBlockStore.getState().getBlock('t')?.content?.title).toBe('새 제목');
  });

  it('preserves other documents in byId when syncing active document structure', () => {
    useNoteBlockStore.getState().hydrate([
      block('a1', 'text', { text: 'doc A' }, 'doc-a'),
      block('b1', 'text', { text: 'doc B cached' }, 'doc-b'),
    ]);
    useNoteBlockStore.getState().setActiveDocumentId('doc-a');
    useNoteBlockStore.getState().syncBlocksStructure([
      block('a1', 'text', { text: 'doc A' }, 'doc-a'),
      block('a2', 'text', { text: 'new row' }, 'doc-a'),
    ]);

    expect(useNoteBlockStore.getState().getBlock('b1')?.content?.text).toBe('doc B cached');
    expect(useNoteBlockStore.getState().getBlock('a2')?.content?.text).toBe('new row');
    expect(useNoteBlockStore.getState().getBlock('a1')?.content?.text).toBe('doc A');
  });

  it('removes deleted blocks from active document only', () => {
    useNoteBlockStore.getState().hydrate([
      block('a1', 'text', { text: 'stay' }, 'doc-a'),
      block('a2', 'text', { text: 'gone' }, 'doc-a'),
      block('b1', 'text', { text: 'other doc' }, 'doc-b'),
    ]);
    useNoteBlockStore.getState().setActiveDocumentId('doc-a');
    useNoteBlockStore.getState().syncBlocksStructure([
      block('a1', 'text', { text: 'stay' }, 'doc-a'),
    ]);

    expect(useNoteBlockStore.getState().getBlock('a2')).toBeUndefined();
    expect(useNoteBlockStore.getState().getBlock('b1')?.content?.text).toBe('other doc');
  });

  it('keeps canonical block order when applying structural commands', () => {
    useNoteBlockStore.getState().hydrate([
      { ...block('a', 'text', { text: 'A' }), order_index: 0 },
      { ...block('b', 'text', { text: 'B' }), order_index: 1 },
    ]);

    const next = useNoteBlockStore.getState().applyBlocks((blocks) => [
      { ...blocks[1], order_index: 0 },
      { ...blocks[0], order_index: 1 },
    ]);

    expect(next.map((item) => item.id)).toEqual(['b', 'a']);
    expect(useNoteBlockStore.getState().getBlocksArray().map((item) => item.id)).toEqual(['b', 'a']);
  });

  it('updates canonical content without changing structural order', () => {
    useNoteBlockStore.getState().hydrate([
      block('a', 'text', { text: 'A' }),
      block('b', 'text', { text: 'B' }),
    ]);

    useNoteBlockStore.getState().patchContent('a', { text: 'typed' });

    expect(useNoteBlockStore.getState().getBlocksArray().map((item) => item.id)).toEqual(['a', 'b']);
    expect(useNoteBlockStore.getState().getBlocksArray()[0].content.text).toBe('typed');
  });
});
