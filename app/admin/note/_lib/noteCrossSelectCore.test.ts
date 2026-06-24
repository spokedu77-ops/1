import { describe, expect, it } from 'vitest';
import {
  isMultiBlockCrossSelect,
  resolveCrossRanges,
  type BlockCrossMeta,
  type CrossSelectAnchor,
} from './noteCrossSelectCore';

function meta(surface: BlockCrossMeta['surface'], textEnd: number): BlockCrossMeta {
  return { surface, textEnd };
}

describe('resolveCrossRanges', () => {
  const ids = ['a', 'b', 'c'];
  const getMeta = (id: string) => {
    if (id === 'a') return meta('editor', 10);
    if (id === 'b') return meta('editor', 8);
    if (id === 'c') return meta('toggle-title', 5);
    return null;
  };

  it('단일 블록 — anchor↔hover 캐럿 구간', () => {
    const anchor: CrossSelectAnchor = { blockId: 'a', pos: 3, surface: 'editor' };
    const ranges = resolveCrossRanges(ids, anchor, 'a', 7, getMeta);
    expect(ranges).toEqual([{ blockId: 'a', from: 3, to: 7, surface: 'editor' }]);
    expect(isMultiBlockCrossSelect(ranges)).toBe(false);
  });

  it('다중 블록 — 중간 블록 전체 선택', () => {
    const anchor: CrossSelectAnchor = { blockId: 'a', pos: 4, surface: 'editor' };
    const ranges = resolveCrossRanges(ids, anchor, 'c', 2, getMeta);
    expect(ranges).toHaveLength(3);
    expect(ranges[0]).toMatchObject({ blockId: 'a', from: 4, to: 10 });
    expect(ranges[1]).toMatchObject({ blockId: 'b', from: 1, to: 8 });
    expect(ranges[2]).toMatchObject({ blockId: 'c', from: 0, to: 2 });
    expect(isMultiBlockCrossSelect(ranges)).toBe(true);
  });

  it('선택 불가 블록은 span에서 건너뜀', () => {
    const anchor: CrossSelectAnchor = { blockId: 'a', pos: 2, surface: 'editor' };
    const ranges = resolveCrossRanges(['a', 'gap', 'c'], anchor, 'c', 1, (id) => (
      id === 'gap' ? null : getMeta(id)
    ));
    expect(ranges.map((r) => r.blockId)).toEqual(['a', 'c']);
  });
});
