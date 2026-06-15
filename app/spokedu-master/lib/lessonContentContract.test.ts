import { describe, expect, it } from 'vitest';
import {
  extractExactSectionText,
  parseTextareaLines,
  parseVariationMethod,
  serializeVariationMethod,
} from './lessonContentContract';

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

  it('extracts only the exact requested section', () => {
    const source = [
      '[사전 교육]',
      '준비 안내',
      '[안전 포인트]',
      '보존할 안전 문구',
    ].join('\n');
    expect(extractExactSectionText(source, '사전 교육')).toBe('준비 안내');
    expect(extractExactSectionText(source, '운영 팁')).toBe('');
  });

  it('parses Master meta textarea content into display lines', () => {
    expect(parseTextareaLines(' 첫 줄 \n\n 둘째 줄 ')).toEqual(['첫 줄', '둘째 줄']);
    expect(parseTextareaLines(null)).toEqual([]);
  });
});
