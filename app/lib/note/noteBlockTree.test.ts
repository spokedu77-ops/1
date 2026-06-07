import { describe, expect, it } from 'vitest';
import { planBlockDropAt } from './noteBlockTree';

type Block = {
  id: string;
  type: string;
  parent_block_id: string | null;
  order_index: number;
  content: Record<string, unknown>;
};

const block = (
  id: string,
  order_index: number,
  parent_block_id: string | null = null,
  type = 'text',
): Block => ({ id, type, parent_block_id, order_index, content: {} });

describe('planBlockDropAt', () => {
  it('reorders blocks within the same parent', () => {
    const blocks = [block('a', 0), block('b', 1), block('c', 2)];

    const plan = planBlockDropAt(blocks, 'c', 'a', 'before');

    expect(plan?.targetParentId).toBeNull();
    expect(plan?.targetSiblings.map((item) => [item.id, item.order_index])).toEqual([
      ['c', 0],
      ['a', 1],
      ['b', 2],
    ]);
  });

  it('moves a root block inside a toggle', () => {
    const blocks = [
      block('toggle', 0, null, 'toggle'),
      block('root', 1),
      block('child', 0, 'toggle'),
    ];

    const plan = planBlockDropAt(blocks, 'root', 'toggle', 'inside');

    expect(plan?.targetParentId).toBe('toggle');
    expect(plan?.placedInToggle).toBe(true);
    expect(plan?.targetSiblings.map((item) => [item.id, item.order_index])).toEqual([
      ['child', 0],
      ['root', 1],
    ]);
  });

  it('moves a toggle child back to the root list', () => {
    const blocks = [
      block('toggle', 0, null, 'toggle'),
      block('root', 1),
      block('child', 0, 'toggle'),
    ];

    const plan = planBlockDropAt(blocks, 'child', 'root', 'after');

    expect(plan?.targetParentId).toBeNull();
    expect(plan?.placedInToggle).toBe(false);
    expect(plan?.targetSiblings.map((item) => [item.id, item.order_index])).toEqual([
      ['toggle', 0],
      ['root', 1],
      ['child', 2],
    ]);
  });

  it('rejects dropping a parent into its own descendant', () => {
    const blocks = [
      block('toggle', 0, null, 'toggle'),
      block('child-toggle', 0, 'toggle', 'toggle'),
    ];

    expect(planBlockDropAt(blocks, 'toggle', 'child-toggle', 'inside')).toBeNull();
  });
});
