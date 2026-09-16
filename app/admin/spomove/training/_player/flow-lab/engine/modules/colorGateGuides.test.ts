import { describe, expect, it } from 'vitest';
import { COLOR_GATE_POSE_SEQUENCE, colorGatePosesForVariant } from './colorGateGuides';

describe('Motion Gate option image pools', () => {
  it('keeps single and compound solo/together pools separate and covers every pose once', () => {
    const easy = colorGatePosesForVariant('solo-easy');
    const normal = colorGatePosesForVariant('solo-normal');
    const togetherSingle = colorGatePosesForVariant('together-easy');
    const togetherCompound = colorGatePosesForVariant('together-normal');

    expect(easy).toHaveLength(20);
    expect(normal).toHaveLength(40);
    expect(togetherSingle).toHaveLength(5);
    expect(togetherCompound).toHaveLength(10);

    expect(new Set([...normal, ...togetherCompound])).toEqual(new Set(COLOR_GATE_POSE_SEQUENCE));
  });
});
