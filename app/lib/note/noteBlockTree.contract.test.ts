import { describe, expect, it } from 'vitest';
import {
  collectBlockForestIds,
  planBlockDropAt,
  planBlockForestDropAt,
  topLevelSelectedDragIds,
  type BlockDropPosition,
} from './noteBlockTree';

type Block = {
  id: string;
  type: string;
  parent_block_id: string | null;
  order_index: number;
  content?: Record<string, unknown>;
};

function block(
  id: string,
  parent: string | null,
  order: number,
  type = 'text',
  content: Record<string, unknown> = {},
): Block {
  return { id, type, parent_block_id: parent, order_index: order, content };
}

describe('admin note minimum Notion block contract', () => {
  it('moves a block inside a toggle through parent_block_id only', () => {
    const blocks = [
      block('toggle', null, 0, 'toggle'),
      block('a', null, 1),
    ];
    const plan = planBlockDropAt(blocks, 'a', 'toggle', 'inside');
    expect(plan).toMatchObject({
      targetParentId: 'toggle',
      placedInToggle: true,
    });
    expect(plan?.targetSiblings.map((item) => ({
      id: item.id,
      parent_block_id: item.parent_block_id,
      order_index: item.order_index,
    }))).toEqual([
      { id: 'a', parent_block_id: null, order_index: 0 },
    ]);
  });

  it('keeps page as a first-class nested container', () => {
    const blocks = [
      block('page-a', null, 0, 'page'),
      block('page-b', null, 1, 'page'),
      block('todo', null, 2, 'todo'),
      block('toggle', null, 3, 'toggle'),
    ];

    expect(planBlockDropAt(blocks, 'page-b', 'page-a', 'inside')?.targetParentId).toBe('page-a');
    expect(planBlockDropAt(blocks, 'todo', 'page-a', 'inside')?.targetParentId).toBe('page-a');
    expect(planBlockDropAt(blocks, 'toggle', 'page-a', 'inside')?.targetParentId).toBe('page-a');
  });

  it('keeps todo as a leaf, allows lists in toggles, and blocks page inside toggle', () => {
    const blocks = [
      block('todo-parent', null, 0, 'todo'),
      block('toggle-parent', null, 1, 'toggle'),
      block('page', null, 2, 'page'),
      block('child', null, 3, 'todo'),
      block('bullet', null, 4, 'bulletList'),
      block('numbered', null, 5, 'numberedList'),
    ];

    expect(planBlockDropAt(blocks, 'child', 'todo-parent', 'inside')).toBeNull();
    expect(planBlockDropAt(blocks, 'bullet', 'toggle-parent', 'inside')?.targetParentId).toBe('toggle-parent');
    expect(planBlockDropAt(blocks, 'numbered', 'toggle-parent', 'inside')?.targetParentId).toBe('toggle-parent');
    expect(planBlockDropAt(blocks, 'page', 'toggle-parent', 'inside')).toBeNull();
  });

  it('rejects moving a block into its own descendant', () => {
    const blocks = [
      block('parent', null, 0, 'toggle'),
      block('child', 'parent', 0),
    ];
    expect(planBlockDropAt(blocks, 'parent', 'child', 'inside')).toBeNull();
  });

  it('treats selected descendants as implied during marquee drag', () => {
    const blocks = [
      block('parent', null, 0, 'toggle'),
      block('child', 'parent', 0),
      block('sibling', null, 1),
    ];
    expect(topLevelSelectedDragIds(['parent', 'child', 'sibling'], blocks)).toEqual([
      'parent',
      'sibling',
    ]);
    expect(collectBlockForestIds(['parent', 'child'], blocks).sort()).toEqual([
      'child',
      'parent',
    ]);
  });

  it('plans marquee forest insertion under a non-page block without duplicating selected descendants', () => {
    const blocks = [
      block('target', null, 0, 'toggle'),
      block('parent', null, 1),
      block('child', 'parent', 0),
      block('sibling', null, 2),
    ];
    const plan = planBlockForestDropAt(
      blocks,
      ['parent', 'child', 'sibling'],
      'target',
      'inside',
    );
    expect(plan?.roots.map((item) => item.id)).toEqual(['parent', 'sibling']);
    expect(plan?.targetParentId).toBe('target');
    expect(plan?.targetSiblings.map((item) => item.id)).toEqual(['parent', 'sibling']);
  });

  it.each(['before', 'after'] satisfies BlockDropPosition[])(
    'does not use forest-drop planner for %s reorder operations',
    (position) => {
      const blocks = [
        block('a', null, 0),
        block('b', null, 1),
      ];
      expect(planBlockForestDropAt(blocks, ['a'], 'b', position)).toBeNull();
    },
  );
});
