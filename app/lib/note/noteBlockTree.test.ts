import { describe, expect, it } from 'vitest';
import {
  bulletListNestLevelAmongContainers,
  collectBlockForestIds,
  collectBlockSubtreeIds,
  flattenVisualBlockIds,
  getBlockRangeIdsInVisualOrder,
  numberedListIndexAmongSiblings,
  planBlockDropAt,
  planBlockTabIndent,
  planCanonicalizeBlockTree,
  planMoveSiblingBlockGroup,
  resolveVisualNavigateTarget,
  topLevelSelectedDragIds,
} from './noteBlockTree';

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

describe('block subtree deletion', () => {
  const blocks = [
    block('root', 0),
    block('child-a', 0, 'root'),
    block('grandchild', 0, 'child-a'),
    block('child-b', 1, 'root'),
    block('other', 1),
  ];

  it('collects a block and all descendants without unrelated siblings', () => {
    expect(collectBlockSubtreeIds('root', blocks)).toEqual([
      'root',
      'child-a',
      'grandchild',
      'child-b',
    ]);
  });

  it('deduplicates overlapping selected subtrees', () => {
    expect(collectBlockForestIds(['root', 'child-a', 'other'], blocks)).toEqual([
      'root',
      'child-a',
      'grandchild',
      'child-b',
      'other',
    ]);
  });
});

describe('canonical block tree migration', () => {
  it('keeps an existing child under its parent and removes legacy depth', () => {
    const blocks = [
      block('toggle', 0, null, 'toggle'),
      {
        ...block('body', 0, 'toggle', 'text'),
        content: { migratedFromToggleBody: true, text: '본문', depth: 1 },
      },
    ];

    const result = planCanonicalizeBlockTree(blocks);

    expect(result.blocks.find((item) => item.id === 'body')?.parent_block_id).toBe('toggle');
    expect(result.blocks.find((item) => item.id === 'body')?.content.depth).toBeUndefined();
  });

  it('converts root visual depth into parent relationships', () => {
    const blocks = [
      { ...block('a', 0), content: { text: 'A', depth: 0 } },
      { ...block('b', 1), content: { text: 'B', depth: 1 } },
      { ...block('c', 2), content: { text: 'C', depth: 2 } },
      { ...block('d', 3), content: { text: 'D', depth: 1 } },
    ];

    const result = planCanonicalizeBlockTree(blocks);

    expect(result.blocks.map((item) => [
      item.id,
      item.parent_block_id,
      item.order_index,
      item.content.depth,
    ])).toEqual([
      ['a', null, 0, undefined],
      ['b', 'a', 0, undefined],
      ['c', 'b', 0, undefined],
      ['d', 'a', 1, undefined],
    ]);
  });
});

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

describe('planBlockTabIndent', () => {
  it('nests a text block under the previous text sibling', () => {
    const blocks = [
      block('a', 0, null, 'text'),
      block('b', 1, null, 'text'),
    ];

    const plan = planBlockTabIndent(blocks, 'b', 'in');

    expect(plan?.targetParentId).toBe('a');
    expect(plan?.targetSiblings.map((item) => item.id)).toEqual(['b']);
  });

  it('moves a block inside a regular text block', () => {
    const blocks = [
      block('parent', 0, null, 'text'),
      block('child', 1, null, 'todo'),
    ];

    const plan = planBlockDropAt(blocks, 'child', 'parent', 'inside');

    expect(plan?.targetParentId).toBe('parent');
    expect(plan?.targetSiblings.map((item) => item.id)).toEqual(['child']);
  });

  it('nests a bullet list item under the previous bullet sibling', () => {
    const blocks = [
      block('a', 0, null, 'bulletList'),
      block('b', 1, null, 'bulletList'),
    ];

    const plan = planBlockTabIndent(blocks, 'b', 'in');

    expect(plan?.targetParentId).toBe('a');
    expect(plan?.placedInToggle).toBe(false);
    expect(plan?.targetSiblings.map((item) => item.id)).toEqual(['b']);
  });

  it('moves a nested bullet list item out after its parent', () => {
    const blocks = [
      block('a', 0, null, 'bulletList'),
      block('b', 0, 'a', 'bulletList'),
      block('c', 1, null, 'bulletList'),
    ];

    const plan = planBlockTabIndent(blocks, 'b', 'out');

    expect(plan?.targetParentId).toBeNull();
    expect(plan?.targetSiblings.map((item) => item.id)).toEqual(['a', 'b', 'c']);
  });
});

describe('numberedListIndexAmongSiblings', () => {
  it('returns 1-based index among numbered list siblings', () => {
    const siblings = [
      block('a', 0, null, 'numberedList'),
      block('b', 1, null, 'text'),
      block('c', 2, null, 'numberedList'),
    ];

    expect(numberedListIndexAmongSiblings(siblings[0], siblings)).toBe(1);
    expect(numberedListIndexAmongSiblings(siblings[2], siblings)).toBe(2);
  });
});

describe('flattenVisualBlockIds', () => {
  it('returns DFS order matching editor DOM (parent then descendants)', () => {
    const blocks = [
      block('root', 0),
      block('toggle', 1, null, 'toggle'),
      block('child1', 0, 'toggle'),
      block('child2', 1, 'toggle'),
      block('nested', 0, 'child1'),
    ];

    expect(flattenVisualBlockIds(blocks)).toEqual([
      'root',
      'toggle',
      'child1',
      'nested',
      'child2',
    ]);
  });
});

describe('resolveVisualNavigateTarget', () => {
  it('navigates across nested list items (Tab-indent reparent), not only same parent siblings', () => {
    const blocks = [
      block('a', 0, null, 'bulletList'),
      block('b', 0, 'a', 'bulletList'),
      block('c', 0, 'b', 'bulletList'),
      block('after', 1, null, 'text'),
    ];

    expect(resolveVisualNavigateTarget(blocks, 'c', 'previous')?.id).toBe('b');
    expect(resolveVisualNavigateTarget(blocks, 'b', 'previous')?.id).toBe('a');
    expect(resolveVisualNavigateTarget(blocks, 'a', 'next')?.id).toBe('b');
    expect(resolveVisualNavigateTarget(blocks, 'c', 'next')?.id).toBe('after');
  });
});

describe('getBlockRangeIdsInVisualOrder', () => {
  it('returns DFS slice for nested list shift-click range', () => {
    const blocks = [
      block('a', 0, null, 'bulletList'),
      block('b', 0, 'a', 'bulletList'),
      block('c', 0, 'b', 'bulletList'),
      block('after', 1, null, 'text'),
    ];

    expect(getBlockRangeIdsInVisualOrder(blocks, 'a', 'c')).toEqual(['a', 'b', 'c']);
    expect(getBlockRangeIdsInVisualOrder(blocks, 'c', 'a')).toEqual(['a', 'b', 'c']);
  });
});

describe('bulletListNestLevelAmongContainers', () => {
  it('counts list container ancestors without depth cap', () => {
    const blocks = [
      block('l0', 0, null, 'bulletList'),
      block('l1', 0, 'l0', 'bulletList'),
      block('l2', 0, 'l1', 'bulletList'),
      block('l3', 0, 'l2', 'bulletList'),
      block('l4', 0, 'l3', 'bulletList'),
    ];
    expect(bulletListNestLevelAmongContainers(blocks[4], blocks)).toBe(4);
  });

  it('ignores non-list parents when counting nest level', () => {
    const blocks = [
      block('toggle', 0, null, 'toggle'),
      block('item', 0, 'toggle', 'bulletList'),
    ];
    expect(bulletListNestLevelAmongContainers(blocks[1], blocks)).toBe(0);
  });
});

describe('multi-drag selection helpers', () => {
  it('topLevelSelectedDragIds drops nested ids when ancestor is selected', () => {
    const blocks = [
      block('toggle', 0, null, 'toggle'),
      block('a', 0, 'toggle'),
      block('b', 1, 'toggle'),
      block('root', 1),
    ];
    expect(topLevelSelectedDragIds(['toggle', 'a', 'b', 'root'], blocks)).toEqual([
      'toggle',
      'root',
    ]);
    expect(topLevelSelectedDragIds(['a', 'b'], blocks)).toEqual(['a', 'b']);
  });
});

describe('planMoveSiblingBlockGroup', () => {
  it('reorders nested siblings inside a toggle', () => {
    const blocks = [
      block('toggle', 0, null, 'toggle'),
      block('a', 0, 'toggle'),
      block('b', 1, 'toggle'),
      block('c', 2, 'toggle'),
    ];
    const next = planMoveSiblingBlockGroup(blocks, ['a', 'b'], 'c', 'after');
    const children = next!
      .filter((item) => item.parent_block_id === 'toggle')
      .sort((x, y) => x.order_index - y.order_index);
    expect(children.map((item) => item.id)).toEqual(['c', 'a', 'b']);
  });
});
