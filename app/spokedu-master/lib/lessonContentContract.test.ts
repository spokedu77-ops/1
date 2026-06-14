import { describe, expect, it } from 'vitest';
import { parseVariationMethod, serializeVariationMethod } from './lessonContentContract';

describe('lesson content contract', () => {
  it('reads and writes only the current variation method section', () => {
    expect(serializeVariationMethod('1. 거리 줄이기\n2. 역할 바꾸기')).toBe(
      '[변형 방법]\n1. 거리 줄이기\n2. 역할 바꾸기',
    );
    expect(parseVariationMethod('[변형 방법]\n거리 줄이기')).toEqual(['거리 줄이기']);
  });

  it('does not merge retired legacy sections', () => {
    const legacyLabels = [
      ['운영', ' 팁'].join(''),
      ['난이도', ' 낮추기'].join(''),
      ['난이도', ' 높이기'].join(''),
      ['응용', ' 방법'].join(''),
    ];
    const legacy = [
      `[${legacyLabels[0]}]`,
      '레거시 운영',
      `[${legacyLabels[1]}]`,
      '레거시 쉬움',
      `[${legacyLabels[2]}]`,
      '레거시 어려움',
      `[${legacyLabels[3]}]`,
      '레거시 응용',
    ].join('\n');
    expect(parseVariationMethod(legacy)).toEqual([]);
  });
});
