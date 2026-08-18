import { describe, expect, it } from 'vitest';

import { resolvePlannedTotal, resolvePlannedTotalAfterExtend } from './plannedRoundTotal';

describe('resolvePlannedTotalAfterExtend', () => {
  it('8회 중 1회 취소 후 1회 추가하면 분모는 9 (활성 7+1=8이 아님)', () => {
    const rows = [
      { status: 'opened', round_total: 8, round_index: 1 },
      { status: 'opened', round_total: 8, round_index: 2 },
      { status: 'cancelled', round_total: 8, round_index: 3 },
      { status: 'opened', round_total: 8, round_index: 4 },
      { status: 'opened', round_total: 8, round_index: 5 },
      { status: 'opened', round_total: 8, round_index: 6 },
      { status: 'opened', round_total: 8, round_index: 7 },
      { status: 'opened', round_total: 8, round_index: 8 },
    ];
    expect(resolvePlannedTotal(rows)).toBe(8);
    expect(resolvePlannedTotalAfterExtend(rows, 1)).toBe(9);
  });
});
