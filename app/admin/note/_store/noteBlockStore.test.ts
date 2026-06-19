import { describe, expect, it, beforeEach } from 'vitest';
import { useNoteBlockStore } from '../_store/noteBlockStore';
import type { NoteBlock } from '../_lib/types';

const block = (
  id: string,
  type: NoteBlock['type'],
  content: Record<string, unknown>,
): NoteBlock => ({
  id,
  document_id: 'doc',
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
});
