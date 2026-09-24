import { describe, expect, it } from 'vitest';

import {
  diveActionMoveDurationSec,
  diveActionMoveStageCount,
  formatDiveActionMoveDuration,
  formatDiveActionMoveDurationDetail,
} from './diveActionMoveTiming';

describe('dive action move timing', () => {
  it('counts SIDE/JUMP/DUCK at 20 seconds plus BONUS as 120 seconds', () => {
    const selection = { side: true, jump: true, duck: true, bonus: true };
    expect(diveActionMoveDurationSec(selection, 20)).toBe(120);
    expect(diveActionMoveStageCount(selection)).toBe(4);
    expect(formatDiveActionMoveDuration(120)).toBe('2분');
    expect(formatDiveActionMoveDurationDetail(selection, 20)).toBe('SIDE · JUMP · DUCK 60초 + BONUS 60초');
  });

  it('counts SIDE/JUMP at 15 seconds without BONUS as 30 seconds', () => {
    const selection = { side: true, jump: true, duck: false, bonus: false };
    expect(diveActionMoveDurationSec(selection, 15)).toBe(30);
    expect(diveActionMoveStageCount(selection)).toBe(2);
    expect(formatDiveActionMoveDurationDetail(selection, 15)).toBe('SIDE · JUMP 30초');
  });

  it('counts DUCK at 35 seconds plus BONUS as 95 seconds', () => {
    const selection = { side: false, jump: false, duck: true, bonus: true };
    expect(diveActionMoveDurationSec(selection, 35)).toBe(95);
    expect(diveActionMoveStageCount(selection)).toBe(2);
    expect(formatDiveActionMoveDuration(95)).toBe('1분 35초');
    expect(formatDiveActionMoveDurationDetail(selection, 35)).toBe('DUCK 35초 + BONUS 60초');
  });
});