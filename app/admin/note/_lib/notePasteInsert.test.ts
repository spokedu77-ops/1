import { describe, expect, it, vi } from 'vitest';
import type { NoteBlock } from './types';
import { useNoteBlockStore } from '../_store/noteBlockStore';
import {
  buildBlockClipboardPayload,
  clipboardPayloadToPasteSpecs,
} from './noteBlockClipboard';
import {
  insertPastedBlockSpecsAfterAnchor,
  insertPastedBlockSpecsAfterBlock,
  resolvePasteSourceContent,
  type PasteInsertContext,
} from './notePasteInsert';
import { contentForPastedBlock } from './notePasteBlocks';
import { collectBlockTransactionIds } from './noteBlockCommands';

function block(
  id: string,
  type: NoteBlock['type'],
  order: number,
  parentId: string | null = null,
): NoteBlock {
  return {
    id,
    document_id: 'doc-1',
    type,
    order_index: order,
    parent_block_id: parentId,
    content: { text: id },
    created_at: '',
    updated_at: '',
  };
}

describe('insertPastedBlockSpecsAfterBlock nested lists', () => {
  it('resolves paste source content from active store metadata', () => {
    const callout = {
      ...block('callout', 'callout', 0),
      content: { text: 'stale', html: '<p>stale</p>', icon: 'old' },
    };
    useNoteBlockStore.getState().setActiveDocumentId('doc-1');
    useNoteBlockStore.getState().hydrate([callout]);
    useNoteBlockStore.getState().patchContent('callout', {
      text: 'live',
      html: '<p>live</p>',
      icon: '!',
      blockColor: 'yellow',
    });

    expect(resolvePasteSourceContent(callout)).toMatchObject({
      text: 'live',
      html: '<p>live</p>',
      icon: '!',
      blockColor: 'yellow',
    });
  });

  it('keeps todo checked, toggle children, and page links when converting block clipboard to paste specs', () => {
    const blocks: NoteBlock[] = [
      {
        ...block('todo', 'todo', 0),
        content: { text: '7.20 월요일 11시 강승현 면접', checked: true },
      },
      {
        ...block('toggle', 'toggle', 1),
        content: { title: 'P0 핵심 과제', collapsed: true },
      },
      {
        ...block('toggle-child', 'text', 0, 'toggle'),
        content: { text: '토글 자식 내용', html: '<p>토글 자식 내용</p>' },
      },
      {
        ...block('page-link', 'page', 2),
        content: { title: '최지훈 업무노트 하위페이지', page_document_id: 'child-doc-1' },
      },
    ];

    const payload = buildBlockClipboardPayload(blocks, ['todo', 'toggle', 'page-link']);
    const specs = clipboardPayloadToPasteSpecs(payload!);

    expect(specs).toEqual([
      expect.objectContaining({
        type: 'todo',
        text: '7.20 월요일 11시 강승현 면접',
        checked: true,
      }),
      expect.objectContaining({
        type: 'toggle',
        text: 'P0 핵심 과제',
        collapsed: true,
        children: [expect.objectContaining({ text: '토글 자식 내용' })],
      }),
      expect.objectContaining({
        type: 'page',
        text: '최지훈 업무노트 하위페이지',
        pageDocumentId: 'child-doc-1',
      }),
    ]);
  });

  it('treats page links as terminal clipboard nodes', () => {
    const blocks: NoteBlock[] = [
      {
        ...block('page-link', 'page', 0),
        content: { title: '최지훈 업무노트 하위페이지', page_document_id: 'child-doc-1' },
      },
      {
        ...block('misplaced-child', 'text', 0, 'page-link'),
        content: { text: '현재 문서에서 page 아래에 매달리면 안 되는 블록' },
      },
    ];

    const payload = buildBlockClipboardPayload(blocks, ['page-link']);
    const specs = clipboardPayloadToPasteSpecs(payload!);

    expect(payload?.blocks[0].children).toBeUndefined();
    expect(specs).toEqual([
      expect.objectContaining({
        type: 'page',
        text: '최지훈 업무노트 하위페이지',
        pageDocumentId: 'child-doc-1',
      }),
    ]);
  });

  it('creates pasted page block content without losing page_document_id', () => {
    const content = contentForPastedBlock(
      {
        type: 'page',
        text: '최지훈 업무노트 하위페이지',
        pageDocumentId: 'child-doc-1',
      },
      {},
    );

    expect(content).toMatchObject({
      title: '최지훈 업무노트 하위페이지',
      page_document_id: 'child-doc-1',
    });
  });

  it('inserts nested siblings under separate parents with correct order', async () => {
    const blocks: NoteBlock[] = [block('anchor', 'text', 0)];
    const blocksRef = { current: blocks };
    const created: Array<{ parentId: string | null; type: string; index: number; id: string }> = [];
    let seq = 0;

    const ctx: PasteInsertContext = {
      blocksRef,
      insertBlockAmongSiblings: vi.fn(async (
        parentId: string | null,
        type: NoteBlock['type'],
        insertIndex: number,
      ) => {
        seq += 1;
        const id = `n${seq}`;
        created.push({ parentId, type, index: insertIndex, id });
        const next: NoteBlock = {
          ...block(id, type, insertIndex, parentId),
          order_index: insertIndex,
        };
        blocksRef.current = [...blocksRef.current, next];
        return next;
      }),
      changeBlockType: vi.fn(async () => {}),
      syncBlockContent: vi.fn(),
    };

    await insertPastedBlockSpecsAfterBlock(
      ctx,
      blocksRef.current[0],
      [
        { type: 'bulletList', text: 'Root A', listNestLevel: 0 },
        { type: 'bulletList', text: 'Child A1', listNestLevel: 1 },
        { type: 'bulletList', text: 'Child A2', listNestLevel: 1 },
        { type: 'bulletList', text: 'Root B', listNestLevel: 0 },
      ],
      {},
    );

    expect(created).toEqual([
      { parentId: null, type: 'bulletList', index: 1, id: 'n1' },
      { parentId: 'n1', type: 'bulletList', index: 0, id: 'n2' },
      { parentId: 'n1', type: 'bulletList', index: 1, id: 'n3' },
      { parentId: null, type: 'bulletList', index: 2, id: 'n4' },
    ]);
  });

  it('updates the anchor, preserves source metadata, and includes the whole paste in one transaction scope', async () => {
    const anchor = {
      ...block('anchor', 'callout', 0),
      content: {
        text: 'old',
        html: '<p>old</p>',
        icon: '!',
        blockColor: 'yellow',
      },
    };
    const blocksRef: { current: NoteBlock[] } = { current: [anchor] };
    const before = blocksRef.current.map((item) => ({ ...item, content: { ...item.content } }));
    let seq = 0;

    const ctx: PasteInsertContext = {
      blocksRef,
      insertBlockAmongSiblings: vi.fn(async (
        parentId: string | null,
        type: NoteBlock['type'],
        insertIndex: number,
        options?: { content?: Record<string, unknown> },
      ) => {
        seq += 1;
        const created: NoteBlock = {
          ...block(`pasted-${seq}`, type, insertIndex, parentId),
          content: options?.content ?? {},
        };
        blocksRef.current = [...blocksRef.current, created];
        return created;
      }),
      changeBlockType: vi.fn(async () => {}),
      syncBlockContent: vi.fn((blockId: string, content: Record<string, unknown>) => {
        blocksRef.current = blocksRef.current.map((item) =>
          (item.id === blockId ? { ...item, content } : item),
        );
      }),
    };

    await insertPastedBlockSpecsAfterAnchor(
      ctx,
      anchor,
      [
        { type: 'callout', text: 'first', html: '<p>first</p>' },
        { type: 'text', text: 'second' },
      ],
      anchor.content,
    );

    expect(blocksRef.current[0].content).toMatchObject({
      text: 'first',
      html: '<p>first</p>',
      icon: '!',
      blockColor: 'yellow',
    });
    expect(blocksRef.current[1]).toMatchObject({
      id: 'pasted-1',
      type: 'text',
      parent_block_id: null,
      order_index: 1,
      content: { text: 'second' },
    });
    expect(new Set(collectBlockTransactionIds(before, blocksRef.current))).toEqual(
      new Set(['anchor', 'pasted-1']),
    );
  });

  it('keeps a mixed structural paste as one complete transaction after rewriting the anchor', async () => {
    const anchor = {
      ...block('anchor', 'text', 0),
      content: { text: 'replace me', html: '<p>replace me</p>' },
    };
    const blocksRef: { current: NoteBlock[] } = { current: [anchor] };
    const before = blocksRef.current.map((item) => ({ ...item, content: { ...item.content } }));
    let seq = 0;

    const ctx: PasteInsertContext = {
      blocksRef,
      insertBlockAmongSiblings: vi.fn(async (
        parentId: string | null,
        type: NoteBlock['type'],
        insertIndex: number,
        options?: { content?: Record<string, unknown> },
      ) => {
        seq += 1;
        const created: NoteBlock = {
          ...block(`pasted-${seq}`, type, insertIndex, parentId),
          content: options?.content ?? {},
        };
        blocksRef.current = [...blocksRef.current, created];
        return created;
      }),
      changeBlockType: vi.fn(async (target: NoteBlock, type: NoteBlock['type']) => {
        blocksRef.current = blocksRef.current.map((item) =>
          (item.id === target.id ? { ...item, type } : item),
        );
      }),
      syncBlockContent: vi.fn((blockId: string, content: Record<string, unknown>) => {
        blocksRef.current = blocksRef.current.map((item) =>
          (item.id === blockId ? { ...item, content } : item),
        );
      }),
    };

    const result = await insertPastedBlockSpecsAfterAnchor(
      ctx,
      anchor,
      [
        {
          type: 'toggle',
          text: 'P0 핵심 과제',
          collapsed: true,
          children: [
            { type: 'todo', text: '7.20 강승현 면접', checked: false },
          ],
        },
        {
          type: 'page',
          text: '최지훈 업무노트 하위페이지',
          pageDocumentId: 'child-doc-1',
        },
      ],
      anchor.content,
    );

    expect(blocksRef.current).toEqual([
      expect.objectContaining({
        id: 'anchor',
        type: 'toggle',
        content: expect.objectContaining({
          title: 'P0 핵심 과제',
          collapsed: true,
        }),
      }),
      expect.objectContaining({
        id: 'pasted-1',
        type: 'todo',
        parent_block_id: 'anchor',
        order_index: 0,
        content: expect.objectContaining({
          text: '7.20 강승현 면접',
          checked: false,
        }),
      }),
      expect.objectContaining({
        id: 'pasted-2',
        type: 'page',
        parent_block_id: null,
        order_index: 1,
        content: expect.objectContaining({
          title: '최지훈 업무노트 하위페이지',
          page_document_id: 'child-doc-1',
        }),
      }),
    ]);
    expect(result).toEqual({ lastFocusId: 'pasted-2', lastFocusPart: 'editor' });
    expect(new Set(collectBlockTransactionIds(before, blocksRef.current))).toEqual(
      new Set(['anchor', 'pasted-1', 'pasted-2']),
    );
  });
});
