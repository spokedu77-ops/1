import { describe, expect, it } from 'vitest';
import { resolveCreateBlockPersistOrders } from './noteCreatePersistOrders';
import { assertPersistOpIsSafe } from './notePersistOpGuard';
import type { NotePersistOp } from './noteDocumentOps';
import type { NoteBlock } from './types';

function block(
  id: string,
  order_index: number,
  overrides: Partial<NoteBlock> = {},
): NoteBlock {
  return {
    id,
    document_id: 'doc-1',
    parent_block_id: null,
    type: 'text',
    order_index,
    content: { text: id },
    created_at: '',
    updated_at: '',
    version: 1,
    ...overrides,
  };
}

describe('resolveCreateBlockPersistOrders', () => {
  it('keeps unique live sibling orders when create is already optimistic', () => {
    const created = block('new', 11);
    const blocks = [
      ...Array.from({ length: 11 }, (_, index) => block(`b${index}`, index)),
      created,
      block('tail', 12),
    ];

    const result = resolveCreateBlockPersistOrders({
      blocks,
      documentId: 'doc-1',
      createdId: 'new',
      parentId: null,
      fallbackInsertIndex: 11,
      createdBlock: created,
    });

    expect(result.order_index).toBe(11);
    expect(result.normalizeOrders.find((item) => item.id === 'tail')).toEqual({
      id: 'tail',
      order_index: 12,
    });
    expect(result.repairedSiblings).toBeNull();
  });

  it('repairs duplicate sibling orders before persist', () => {
    const created = block('new', 11);
    const blocks = [
      block('a', 10),
      block('dup-a', 11),
      created,
      block('dup-b', 11),
    ];

    const result = resolveCreateBlockPersistOrders({
      blocks,
      documentId: 'doc-1',
      createdId: 'new',
      parentId: null,
      fallbackInsertIndex: 11,
      createdBlock: created,
    });

    expect(result.repairedSiblings).not.toBeNull();
    const orders = result.repairedSiblings!.map((item) => item.order_index);
    expect(new Set(orders).size).toBe(orders.length);
    expect(result.normalizeOrders.every((item) => item.id !== 'new')).toBe(true);
    expect(result.order_index).toBe(
      result.repairedSiblings!.find((item) => item.id === 'new')!.order_index,
    );
  });

  it('ZERO LOSS #4: densify keeps encounter order on tied order_index (no id sort)', () => {
    // uuid 역순 id여도 화면 만남 순서(z → a → m)를 densify가 유지해야 함
    const created = block('new', 0);
    const blocks = [
      block('z-last-uuid', 0, { type: 'todo', content: { text: 'first on screen', checked: false } }),
      block('a-first-uuid', 0, { type: 'todo', content: { text: 'second on screen', checked: false } }),
      block('m-mid-uuid', 0, { type: 'todo', content: { text: 'third on screen', checked: false } }),
      created,
    ];

    const result = resolveCreateBlockPersistOrders({
      blocks,
      documentId: 'doc-1',
      createdId: 'new',
      parentId: null,
      fallbackInsertIndex: 3,
      createdBlock: created,
    });

    expect(result.repairedSiblings?.map((item) => item.id)).toEqual([
      'z-last-uuid',
      'a-first-uuid',
      'm-mid-uuid',
      'new',
    ]);
    expect(result.repairedSiblings?.map((item) => item.order_index)).toEqual([0, 1, 2, 3]);
  });

  it('reinserts missing create into sibling list', () => {
    const created = block('new', 99);
    const blocks = [block('a', 0), block('b', 1)];

    const result = resolveCreateBlockPersistOrders({
      blocks,
      documentId: 'doc-1',
      createdId: 'new',
      parentId: null,
      fallbackInsertIndex: 1,
      createdBlock: created,
    });

    expect(result.repairedSiblings?.map((item) => item.id)).toEqual(['a', 'new', 'b']);
    expect(result.order_index).toBe(1);
    expect(result.normalizeOrders).toEqual([
      { id: 'a', order_index: 0 },
      { id: 'b', order_index: 2 },
    ]);
  });

  it('C1: stale caller normalizeOrders are replaced so guard accepts create', () => {
    const created = block('new', 1, {
      type: 'todo',
      content: { text: '', html: '<p></p>', checked: false },
    });
    const store = [
      block('a', 0),
      block('b', 1),
      block('c', 1),
    ];
    const persistOrders = resolveCreateBlockPersistOrders({
      blocks: store,
      documentId: 'doc-1',
      createdId: 'new',
      parentId: null,
      fallbackInsertIndex: 1,
      createdBlock: created,
    });
    const repaired = persistOrders.repairedSiblings!;
    const fixed: NotePersistOp = {
      type: 'createBlock',
      id: 'new',
      documentId: 'doc-1',
      blockType: 'todo',
      content: { text: '', html: '<p></p>', checked: false },
      order_index: persistOrders.order_index,
      parent_block_id: null,
      normalizeOrders: persistOrders.normalizeOrders,
      allowEmptyVisibleCreate: true,
    };
    expect(() => assertPersistOpIsSafe(fixed, repaired)).not.toThrow();
  });
});
