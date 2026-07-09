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
    // blocksRef는 store 구독 미러 — pipeline이 직접 갱신하지 않음
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

  it('preserves store text when meta patch uses stale React content', () => {
    const todo = block('todo', 'todo', { text: '', checked: false });
    useNoteBlockStore.getState().hydrate([todo]);
    useNoteBlockStore.getState().patchContent('todo', {
      text: '타이핑된 본문',
      html: '<p>타이핑된 본문</p>',
      checked: false,
    });
    const staleReact = block('todo', 'todo', { text: '', checked: false });
    const blocksRef = { current: [staleReact] };
    const setBlocks = vi.fn();

    applyBlockContentChange({
      block: staleReact,
      content: { ...staleReact.content, checked: true },
      blocksRef,
      setBlocks,
      recordContentUndoBeforeChange: vi.fn(),
      scheduleBlockContentSave: vi.fn(),
    });

    const saved = useNoteBlockStore.getState().getBlock('todo')?.content;
    expect(saved?.text).toBe('타이핑된 본문');
    expect(saved?.checked).toBe(true);
    expect(setBlocks).toHaveBeenCalled();
  });

  it('normalizes todo checked on apply', () => {
    const todo = block('todo', 'todo', { text: '할 일', checked: 1 as unknown as boolean });
    useNoteBlockStore.getState().hydrate([todo]);
    const blocksRef = { current: [todo] };
    const setBlocks = vi.fn();

    applyBlockContentChange({
      block: todo,
      content: { text: '할 일', checked: 1 },
      blocksRef,
      setBlocks,
      recordContentUndoBeforeChange: vi.fn(),
      scheduleBlockContentSave: vi.fn(),
    });

    expect(useNoteBlockStore.getState().getBlock('todo')?.content).toMatchObject({
      text: '할 일',
      checked: false,
    });
  });
});
