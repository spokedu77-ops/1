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

describe('todo nest Tab (parent_block_id)', () => {
  it('nests sibling todo under previous todo via planBlockTabIndent', () => {
    const blocks = [todo('a', 0), todo('b', 1)];
    expect(planTodoListNestTab(blocks, 'b', 'in')).toBeNull();
    const plan = planBlockTabIndent(blocks, 'b', 'in');
    expect(plan?.targetParentId).toBe('a');
    expect(plan?.targetSiblings.map((item) => item.id)).toContain('b');
  });

  it('outdents nested todo after parent via planBlockTabIndent', () => {
    const blocks = [
      todo('a', 0),
      todo('b', 0, { parent_block_id: 'a' }),
    ];
    const plan = planBlockTabIndent(blocks, 'b', 'out');
    expect(plan?.targetParentId).toBeNull();
  });

  it('nests under toggle via planBlockTabIndent', () => {
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
