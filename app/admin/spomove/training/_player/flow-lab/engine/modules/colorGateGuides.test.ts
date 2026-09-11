import { describe, expect, it } from 'vitest';
import { COLOR_GATE_POSE_SEQUENCE, colorGatePosesForVariant } from './colorGateGuides';

describe('Motion Gate option image pools', () => {
  it('keeps the three option pools separate and covers every pose once', () => {
    const easy = colorGatePosesForVariant('solo-easy');
    const normal = colorGatePosesForVariant('solo-normal');
    const together = colorGatePosesForVariant('together-easy');

    expect(easy).toHaveLength(20);
    expect(normal).toHaveLength(40);
    expect(together).toHaveLength(10);

    expect(new Set([...normal, ...together])).toEqual(new Set(COLOR_GATE_POSE_SEQUENCE));
  });
});
