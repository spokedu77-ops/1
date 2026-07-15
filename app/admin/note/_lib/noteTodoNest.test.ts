import { describe, expect, it } from 'vitest';
import { planBlockTabIndent } from '@/app/lib/note/noteBlockTree';
import { planTodoListNestTab } from './noteTodoNest';
import type { NoteBlock } from './types';

function todo(
  id: string,
  order: number,
  extras: Partial<NoteBlock> = {},
): NoteBlock {
  return {
    id,
    document_id: 'doc-1',
    parent_block_id: null,
    type: 'todo',
    order_index: order,
    content: { text: id, checked: false },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    version: 1,
    ...extras,
  };
}

describe('planTodoListNestTab', () => {
  it('increments listNestLevel between sibling todos', () => {
    const blocks = [todo('a', 0), todo('b', 1)];
    expect(planTodoListNestTab(blocks, 'b', 'in')).toEqual({ listNestLevel: 1 });
    expect(planBlockTabIndent(blocks, 'b', 'in')).toBeNull();
  });

  it('decrements listNestLevel on outdent', () => {
    const blocks = [
      todo('a', 0),
      todo('b', 1, { content: { text: 'b', checked: false, listNestLevel: 2 } }),
    ];
    expect(planTodoListNestTab(blocks, 'b', 'out')).toEqual({ listNestLevel: 1 });
  });

  it('defers to block reparent when previous sibling is toggle', () => {
    const blocks: NoteBlock[] = [
      {
        ...todo('toggle', 0),
        type: 'toggle',
        content: { title: 'T', collapsed: false },
      },
      todo('item', 1),
    ];
    expect(planTodoListNestTab(blocks, 'item', 'in')).toBeNull();
    expect(planBlockTabIndent(blocks, 'item', 'in')?.targetParentId).toBe('toggle');
  });
});
