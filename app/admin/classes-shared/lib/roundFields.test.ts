import { describe, expect, it } from 'vitest';

import { buildRoundSnapshot, clampRoundIndex, formatRoundDisplay, isInvalidRoundPair } from './roundFields';

describe('roundFields', () => {
  it('clampRoundIndex: 8/6 같은 비정상 index는 total로 캡', () => {
    expect(clampRoundIndex(8, 6)).toBe(6);
    expect(formatRoundDisplay(8, 6)).toBe('6/6');
  });

  it('buildRoundSnapshot: 그룹 round_total 최댓값을 분모로 사용', () => {
    const snap = buildRoundSnapshot(
      [
        { status: 'cancelled', round_total: 8, round_index: 1 },
        { status: 'opened', round_total: 6, round_index: 3 },
      ],
      3
    );
    expect(snap.round_total).toBe(8);
    expect(snap.round_index).toBe(3);
    expect(snap.round_display).toBe('3/8');
  });

  it('isInvalidRoundPair', () => {
    expect(isInvalidRoundPair(8, 6)).toBe(true);
    expect(isInvalidRoundPair(2, 8)).toBe(false);
  });
});
