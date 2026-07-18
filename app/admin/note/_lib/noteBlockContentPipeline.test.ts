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

/** 단위 테스트용 — 실제품은 pipeline.scheduleContentPatch가 LocalApply */
function scheduleViaStore(
  blockId: string,
  content: unknown,
) {
  useNoteBlockStore.getState().patchContent(
    blockId,
    (content ?? {}) as Record<string, unknown>,
  );
}

describe('applyBlockContentChange', () => {
  beforeEach(() => {
    useNoteBlockStore.getState().setActiveDocumentId('doc');
    useNoteBlockStore.getState().hydrate([]);
  });

  it('updates toggle title via schedule LocalApply', () => {
    const toggle = block('t', 'toggle', { title: '', body: '' });
    useNoteBlockStore.getState().hydrate([toggle]);
    const blocksRef = { current: [toggle] };

    applyBlockContentChange({
      block: toggle,
      content: { title: '섹션 제목', body: '' },
      blocksRef,
      recordContentUndoBeforeChange: vi.fn(),
      scheduleBlockContentSave: scheduleViaStore,
    });

    expect(useNoteBlockStore.getState().getBlock('t')?.content?.title).toBe('섹션 제목');
  });

  it('updates text/html via schedule LocalApply', () => {
    const textBlock = block('a', 'text', { text: 'a', html: '<p>a</p>' });
    useNoteBlockStore.getState().hydrate([textBlock]);
    const blocksRef = { current: [textBlock] };

    applyBlockContentChange({
      block: textBlock,
      content: { text: 'ab', html: '<p>ab</p>' },
      blocksRef,
      recordContentUndoBeforeChange: vi.fn(),
      scheduleBlockContentSave: scheduleViaStore,
    });

    expect(useNoteBlockStore.getState().getBlock('a')?.content?.text).toBe('ab');
  });

  it('can suppress ordinary content undo while structural paste records one transaction', () => {
    const textBlock = block('a', 'text', { text: '', html: '<p></p>' });
    useNoteBlockStore.getState().hydrate([textBlock]);
    const blocksRef = { current: [textBlock] };
    const recordUndo = vi.fn();

    applyBlockContentChange({
      block: textBlock,
      content: { text: 'paste line one', html: '<p>paste line one</p>' },
      blocksRef,
      recordContentUndoBeforeChange: recordUndo,
      scheduleBlockContentSave: scheduleViaStore,
      skipUndo: true,
    });

    expect(recordUndo).not.toHaveBeenCalled();
    expect(useNoteBlockStore.getState().getBlock('a')?.content?.text).toBe('paste line one');
  });

  it('preserves callout metadata when pasted text replaces the body', () => {
    const callout = block('callout', 'callout', {
      text: 'old',
      html: '<p>old</p>',
      icon: '!',
      blockColor: 'yellow',
    });
    useNoteBlockStore.getState().hydrate([callout]);
    const blocksRef = { current: [callout] };

    applyBlockContentChange({
      block: callout,
      content: { text: 'pasted', html: '<p>pasted</p>' },
      blocksRef,
      recordContentUndoBeforeChange: vi.fn(),
      scheduleBlockContentSave: scheduleViaStore,
    });

    expect(useNoteBlockStore.getState().getBlock('callout')?.content).toMatchObject({
      text: 'pasted',
      html: '<p>pasted</p>',
      icon: '!',
      blockColor: 'yellow',
    });
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

    applyBlockContentChange({
      block: staleReact,
      content: { ...staleReact.content, checked: true },
      blocksRef,
      recordContentUndoBeforeChange: vi.fn(),
      scheduleBlockContentSave: scheduleViaStore,
    });

    const saved = useNoteBlockStore.getState().getBlock('todo')?.content;
    expect(saved?.text).toBe('타이핑된 본문');
    expect(saved?.checked).toBe(true);
  });

  it('normalizes todo checked on apply', () => {
    const todo = block('todo', 'todo', { text: '할 일', checked: 1 as unknown as boolean });
    useNoteBlockStore.getState().hydrate([todo]);
    const blocksRef = { current: [todo] };

    applyBlockContentChange({
      block: todo,
      content: { text: '할 일', checked: 1 },
      blocksRef,
      recordContentUndoBeforeChange: vi.fn(),
      scheduleBlockContentSave: scheduleViaStore,
    });

    expect(useNoteBlockStore.getState().getBlock('todo')?.content).toMatchObject({
      text: '할 일',
      checked: false,
    });
  });
});
