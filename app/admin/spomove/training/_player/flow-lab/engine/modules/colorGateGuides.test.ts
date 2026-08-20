import { describe, expect, it } from 'vitest';
import { COLOR_GATE_POSE_SEQUENCE, colorGatePosesForVariant } from './colorGateGuides';

describe('Motion Gate option image pools', () => {
  it('keeps the three option pools separate and covers every pose once', () => {
    const easy = colorGatePosesForVariant('solo-easy');
    const normal = colorGatePosesForVariant('solo-normal');
    const together = colorGatePosesForVariant('together-easy');

    expect(easy).toHaveLength(5);
    expect(normal).toHaveLength(10);
    expect(together).toHaveLength(3);
    expect(together).toEqual(['partner-hold', 'partner-squat', 'partner-high-five']);

    const all = [...easy, ...normal, ...together];
    expect(new Set(all).size).toBe(all.length);
    expect(new Set(all)).toEqual(new Set(COLOR_GATE_POSE_SEQUENCE));
  });
});
