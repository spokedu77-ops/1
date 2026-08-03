import { describe, expect, it } from 'vitest';
import { resolveInboundTopPlacementOrders } from './notePlacementOrders';

describe('resolveInboundTopPlacementOrders (C5)', () => {
  it('prepends inbound roots and renumbers all siblings 0..n-1', () => {
    expect(resolveInboundTopPlacementOrders(
      [
        { id: 'old-a', order_index: 0 },
        { id: 'old-b', order_index: 1 },
      ],
      [{ id: 'new-1' }, { id: 'new-2' }],
    )).toEqual([
      { id: 'new-1', order_index: 0 },
      { id: 'new-2', order_index: 1 },
      { id: 'old-a', order_index: 2 },
      { id: 'old-b', order_index: 3 },
    ]);
  });

  it('drops duplicate inbound ids from the existing list before merge', () => {
    expect(resolveInboundTopPlacementOrders(
      [
        { id: 'keep', order_index: 0 },
        { id: 'moving', order_index: 1 },
      ],
      [{ id: 'moving' }],
    )).toEqual([
      { id: 'moving', order_index: 0 },
      { id: 'keep', order_index: 1 },
    ]);
  });

  it('works when target has no existing siblings', () => {
    expect(resolveInboundTopPlacementOrders([], [{ id: 'a' }, { id: 'b' }])).toEqual([
      { id: 'a', order_index: 0 },
      { id: 'b', order_index: 1 },
    ]);
  });
});
