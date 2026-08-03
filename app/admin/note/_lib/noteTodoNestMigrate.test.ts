import { describe, expect, it } from 'vitest';
import {
  buildTodoNestMigrationPatches,
  migrateTodoListNestLevelsToTree,
} from './noteTodoNestMigrate';
import type { NoteBlock } from './types';

function todo(
  id: string,
  order: number,
  content: Record<string, unknown> = { text: id, checked: false },
): NoteBlock {
  return {
    id,
    document_id: 'doc',
    parent_block_id: null,
    type: 'todo',
    order_index: order,
    content,
    created_at: '',
    updated_at: '',
  };
}

describe('migrateTodoListNestLevelsToTree', () => {
  it('converts listNestLevel siblings into parent_block_id children', () => {
    const { blocks, changed } = migrateTodoListNestLevelsToTree([
      todo('a', 0, { text: 'a', checked: false, listNestLevel: 0 }),
      todo('b', 1, { text: 'b', checked: false, listNestLevel: 1 }),
      todo('c', 2, { text: 'c', checked: false, listNestLevel: 0 }),
    ]);
    expect(changed).toBe(true);
    expect(blocks.find((block) => block.id === 'b')).toMatchObject({
      parent_block_id: 'a',
    });
    expect(blocks.find((block) => block.id === 'b')?.content).not.toHaveProperty('listNestLevel');
    expect(blocks.find((block) => block.id === 'c')?.parent_block_id).toBeNull();
    expect(blocks.find((block) => block.id === 'a')?.content).toMatchObject({ text: 'a', checked: false });
    expect(blocks.find((block) => block.id === 'b')?.content).toMatchObject({ text: 'b', checked: false });
  });

  it('builds durable patches for parent/order/content so open can persist the tree', () => {
    const before = [
      todo('a', 0, { text: 'a', checked: false, listNestLevel: 0 }),
      todo('b', 1, { text: 'b', checked: true, listNestLevel: 1 }),
    ];
    const { blocks, changed } = migrateTodoListNestLevelsToTree(before);
    expect(changed).toBe(true);
    const patches = buildTodoNestMigrationPatches(before, blocks);
    expect(patches.some((patch) => patch.id === 'b' && patch.parent_block_id === 'a')).toBe(true);
    expect(patches.find((patch) => patch.id === 'b')?.content).toMatchObject({
      text: 'b',
      checked: true,
    });
    expect(patches.find((patch) => patch.id === 'b')?.content).not.toHaveProperty('listNestLevel');
  });

  it('never mutates user text or checked during nest remapping', () => {
    const { blocks } = migrateTodoListNestLevelsToTree([
      todo('a', 0, { text: 'keep-a', checked: true, listNestLevel: 0 }),
      todo('b', 1, { text: 'keep-b', checked: false, listNestLevel: 1 }),
    ]);
    expect(blocks.find((block) => block.id === 'a')?.content).toMatchObject({
      text: 'keep-a',
      checked: true,
    });
    expect(blocks.find((block) => block.id === 'b')?.content).toMatchObject({
      text: 'keep-b',
      checked: false,
    });
  });
});
