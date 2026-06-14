import { describe, expect, it } from 'vitest';
import {
  extractExactSectionText,
  parseVariationMethod,
  replaceExactSection,
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

  it('replaces one exact section and preserves the others', () => {
    const source = [
      '라벨 없는 앞 문장',
      '[사전 교육]',
      '기존 안내',
      '[안전 포인트]',
      '보존할 안전 문구',
    ].join('\n');
    expect(replaceExactSection(source, '사전 교육', '새 안내 1\n새 안내 2')).toBe([
      '라벨 없는 앞 문장',
      '[사전 교육]',
      '새 안내 1',
      '새 안내 2',
      '[안전 포인트]',
      '보존할 안전 문구',
    ].join('\n'));
  });

  it('removes only the requested exact section for empty input', () => {
    const source = [
      '[변형 방법]',
      '기존 변형',
      '[응용 방법]',
      '보존할 응용',
    ].join('\n');
    expect(replaceExactSection(source, '변형 방법', '')).toBe([
      '[응용 방법]',
      '보존할 응용',
    ].join('\n'));
  });
});
