import { describe, expect, it } from 'vitest';
import { sanitizeNoteBlockTree } from './noteBlockSanitize';

type Block = {
  id: string;
  type: string;
  parent_block_id: string | null;
  order_index: number;
  created_at?: string;
  content: Record<string, unknown>;
};

const block = (
  id: string,
  type: string,
  parent_block_id: string | null,
  order_index: number,
  created_at?: string,
): Block => ({ id, type, parent_block_id, order_index, created_at, content: {} });

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

  it('preserves nested todo checklist under todo parent', () => {
    const sanitized = sanitizeNoteBlockTree([
      block('todo-parent', 'todo', null, 0),
      block('todo-child', 'todo', 'todo-parent', 0),
    ]);

    expect(sanitized.find((item) => item.id === 'todo-child')?.parent_block_id).toBe('todo-parent');
  });

  it('breaks cycles and preserves unique sibling order_index', () => {
    const sanitized = sanitizeNoteBlockTree([
      block('page-a', 'page', 'page-b', 10),
      block('page-b', 'page', 'page-a', 4),
      block('root', 'text', null, 9),
    ]);

    expect(sanitized.map((item) => item.id).sort()).toEqual(['page-a', 'page-b', 'root']);
    expect(sanitized.every((item) => item.parent_block_id !== item.id)).toBe(true);
    const roots = sanitized.filter((item) => !item.parent_block_id);
    // unique orders must not densify to 0..n-1 (integrity)
    expect(roots.map((item) => item.order_index).sort((a, b) => a - b)).toEqual([4, 9, 10]);
  });

  it('compacts sibling order_index only when duplicates exist', () => {
    const sanitized = sanitizeNoteBlockTree([
      block('a', 'text', null, 2),
      block('b', 'text', null, 2),
      block('c', 'text', null, 5),
    ]);
    const roots = sanitized.filter((item) => !item.parent_block_id);
    expect(roots.map((item) => item.order_index)).toEqual([0, 1, 2]);
  });

  it('densifies duplicate orders preserving encounter order (not id shuffle)', () => {
    const forward = sanitizeNoteBlockTree([
      block('z-last', 'text', null, 3),
      block('a-first', 'text', null, 3),
      block('m-mid', 'text', null, 3),
    ]);
    expect(forward.map((item) => item.id)).toEqual(['z-last', 'a-first', 'm-mid']);
    expect(forward.map((item) => item.order_index)).toEqual([0, 1, 2]);

    const reverse = sanitizeNoteBlockTree([
      block('m-mid', 'text', null, 3),
      block('a-first', 'text', null, 3),
      block('z-last', 'text', null, 3),
    ]);
    expect(reverse.map((item) => item.id)).toEqual(['m-mid', 'a-first', 'z-last']);
  });

  it('sanitizes root siblings per document_id so transfer projections do not compact across docs', () => {
    type DocBlock = Block & { document_id: string };
    const withDoc = (
      id: string,
      document_id: string,
      order_index: number,
    ): DocBlock => ({ ...block(id, 'text', null, order_index), document_id });

    const sanitized = sanitizeNoteBlockTree([
      withDoc('source-a', 'doc-1', 0),
      withDoc('source-b', 'doc-1', 1),
      withDoc('incoming', 'doc-2', 0),
      withDoc('target-old', 'doc-2', 1),
    ]);

    expect(sanitized.find((item) => item.id === 'source-b')?.order_index).toBe(1);
    expect(sanitized.find((item) => item.id === 'target-old')?.order_index).toBe(1);
  });
});
