import { describe, expect, it } from 'vitest';
import { sanitizeNoteBlockTree } from './noteBlockSanitize';

type Block = {
  id: string;
  type: string;
  parent_block_id: string | null;
  order_index: number;
  content: Record<string, unknown>;
};

const block = (
  id: string,
  type: string,
  parent_block_id: string | null,
  order_index: number,
): Block => ({ id, type, parent_block_id, order_index, content: {} });

describe('sanitizeNoteBlockTree', () => {
  it('preserves nested page containers with todo and toggle children', () => {
    const sanitized = sanitizeNoteBlockTree([
      block('page-a', 'page', null, 0),
      block('page-b', 'page', 'page-a', 0),
      block('todo', 'todo', 'page-b', 0),
      block('toggle', 'toggle', 'page-b', 1),
      block('toggle-child', 'todo', 'toggle', 0),
      block('toggle-bullet', 'bulletList', 'toggle', 1),
    ]);

    expect(sanitized.map((item) => [item.id, item.parent_block_id, item.order_index])).toEqual([
      ['page-a', null, 0],
      ['page-b', 'page-a', 0],
      ['todo', 'page-b', 0],
      ['toggle', 'page-b', 1],
      ['toggle-child', 'toggle', 0],
      ['toggle-bullet', 'toggle', 1],
    ]);
  });

  it('flattens forbidden children from text, todo, and toggle page parents', () => {
    const sanitized = sanitizeNoteBlockTree([
      block('text-parent', 'text', null, 0),
      block('todo-parent', 'todo', null, 1),
      block('toggle-parent', 'toggle', null, 2),
      block('under-text', 'todo', 'text-parent', 0),
      block('under-todo', 'text', 'todo-parent', 0),
      block('page-under-toggle', 'page', 'toggle-parent', 0),
    ]);

    expect(sanitized.find((item) => item.id === 'under-text')?.parent_block_id).toBeNull();
    expect(sanitized.find((item) => item.id === 'under-todo')?.parent_block_id).toBeNull();
    expect(sanitized.find((item) => item.id === 'page-under-toggle')?.parent_block_id).toBeNull();
  });

  it('breaks cycles and normalizes sibling order', () => {
    const sanitized = sanitizeNoteBlockTree([
      block('page-a', 'page', 'page-b', 10),
      block('page-b', 'page', 'page-a', 4),
      block('root', 'text', null, 9),
    ]);

    expect(sanitized.map((item) => item.id).sort()).toEqual(['page-a', 'page-b', 'root']);
    expect(sanitized.every((item) => item.parent_block_id !== item.id)).toBe(true);
    const roots = sanitized.filter((item) => !item.parent_block_id);
    expect(roots.map((item) => item.order_index)).toEqual([0, 1, 2]);
  });
});
