import { describe, expect, it, vi, beforeEach } from 'vitest';
import { useNoteBlockStore } from '../_store/noteBlockStore';
import { applyBlockContentChange } from './noteBlockContentPipeline';
import type { NoteBlock } from './types';

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

describe('applyBlockContentChange', () => {
  beforeEach(() => {
    useNoteBlockStore.getState().setActiveDocumentId('doc');
    useNoteBlockStore.getState().hydrate([]);
  });

  it('updates toggle title in store without React-only fields being dropped', () => {
    const toggle = block('t', 'toggle', { title: '', body: '' });
    useNoteBlockStore.getState().hydrate([toggle]);
    const blocksRef = { current: [toggle] };
    const setBlocks = vi.fn();

    applyBlockContentChange({
      block: toggle,
      content: { title: '섹션 제목', body: '' },
      blocksRef,
      setBlocks,
      recordContentUndoBeforeChange: vi.fn(),
      scheduleBlockContentSave: vi.fn(),
    });

    expect(useNoteBlockStore.getState().getBlock('t')?.content?.title).toBe('섹션 제목');
    expect(blocksRef.current[0].content?.title).toBe('섹션 제목');
    expect(setBlocks).toHaveBeenCalled();
  });

  it('skips React setBlocks when only text/html changes', () => {
    const textBlock = block('a', 'text', { text: 'a', html: '<p>a</p>' });
    useNoteBlockStore.getState().hydrate([textBlock]);
    const blocksRef = { current: [textBlock] };
    const setBlocks = vi.fn();

    applyBlockContentChange({
      block: textBlock,
      content: { text: 'ab', html: '<p>ab</p>' },
      blocksRef,
      setBlocks,
      recordContentUndoBeforeChange: vi.fn(),
      scheduleBlockContentSave: vi.fn(),
    });

    expect(useNoteBlockStore.getState().getBlock('a')?.content?.text).toBe('ab');
    expect(setBlocks).not.toHaveBeenCalled();
  });
});
