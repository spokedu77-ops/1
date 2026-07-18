import { describe, expect, it, vi } from 'vitest';
import type { NoteBlock } from './types';
import { useNoteBlockStore } from '../_store/noteBlockStore';
import {
  insertPastedBlockSpecsAfterAnchor,
  insertPastedBlockSpecsAfterBlock,
  resolvePasteSourceContent,
} from './notePasteInsert';
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

  it('inserts nested siblings under separate parents with correct order', async () => {
    const blocks: NoteBlock[] = [block('anchor', 'text', 0)];
    const blocksRef = { current: blocks };
    const created: Array<{ parentId: string | null; type: string; index: number; id: string }> = [];
    let seq = 0;

    const ctx = {
      blocksRef,
      insertBlockAmongSiblings: vi.fn(async (
        parentId: string | null,
        type: NoteBlock['type'],
        insertIndex: number,
      ) => {
        seq += 1;
        const id = `n${seq}`;
        created.push({ parentId, type, index: insertIndex, id });
        const next = {
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
    const blocksRef = { current: [anchor] };
    const before = blocksRef.current.map((item) => ({ ...item, content: { ...item.content } }));
    let seq = 0;

    const ctx = {
      blocksRef,
      insertBlockAmongSiblings: vi.fn(async (
        parentId: string | null,
        type: NoteBlock['type'],
        insertIndex: number,
        options?: { content?: Record<string, unknown> },
      ) => {
        seq += 1;
        const created = {
          ...block(`pasted-${seq}`, type, insertIndex, parentId),
          content: options?.content ?? {},
        };
        blocksRef.current = [...blocksRef.current, created];
        return created;
      }),
      changeBlockType: vi.fn(async () => {}),
      syncBlockContent: vi.fn((blockId: string, content: Record<string, unknown>) => {
        blocksRef.current = blocksRef.current.map((item) =>
          item.id === blockId ? { ...item, content } : item,
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
});
