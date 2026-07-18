import { describe, expect, it } from 'vitest';
import {
  filterTransactionPatchesByExistingIds,
  shouldIgnoreRegressiveContentPatch,
} from './noteOpLogService';

describe('noteOpLogService transaction patch filtering', () => {
  it('drops stale transaction updates for blocks that no longer exist', () => {
    const patches = [
      { id: 'alive', order_index: 0 },
      { id: 'missing', order_index: 1 },
    ];

    expect(
      filterTransactionPatchesByExistingIds(patches, new Set(['alive'])),
    ).toEqual([{ id: 'alive', order_index: 0 }]);
  });

  it('ignores stale prefix patches that would truncate saved text', () => {
    expect(shouldIgnoreRegressiveContentPatch(
      { text: '7.20 월요일 12시 송예원T OT' },
      { text: '7' },
    )).toBe(true);
    expect(shouldIgnoreRegressiveContentPatch(
      { text: '7.20 월요일 12시 송예원T OT' },
      { text: '' },
    )).toBe(true);
    expect(shouldIgnoreRegressiveContentPatch(
      { text: '7.20 월요일 12시 송예원T OT' },
      { text: '7.20' },
      { text: '7.20 월요일 12시 송예원T OT' },
    )).toBe(false);
    expect(shouldIgnoreRegressiveContentPatch(
      { text: '7.20 월요일 12시 송예원T OT' },
      { text: '7.20 월요일 13시 송예원T OT' },
    )).toBe(false);
  });
});
