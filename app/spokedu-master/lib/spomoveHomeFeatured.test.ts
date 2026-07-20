import { describe, expect, it } from 'vitest';
import {
  resolveHomeFeaturedSpomove,
  selectHeuristicFeaturedSpomove,
} from './spomoveHomeFeatured';
import { OFFICIAL_SPOMOVE_LIBRARY } from '../spomove/officialSpomovePresets';

describe('resolveHomeFeaturedSpomove', () => {
  it('관리자 슬롯이 비면 휴리스틱 4개를 반환한다', () => {
    const heuristic = selectHeuristicFeaturedSpomove();
    expect(resolveHomeFeaturedSpomove([null, null, null, null])).toEqual(heuristic);
    expect(heuristic).toHaveLength(4);
  });

  it('명시 슬롯을 우선하고 빈 칸만 자동 채운다', () => {
    const first = OFFICIAL_SPOMOVE_LIBRARY.find((preset) => preset.isReady)!;
    const second = OFFICIAL_SPOMOVE_LIBRARY.find(
      (preset) => preset.isReady && preset.id !== first.id,
    )!;
    const resolved = resolveHomeFeaturedSpomove([first.id, null, second.id, null]);
    expect(resolved).toHaveLength(4);
    expect(resolved[0]?.id).toBe(first.id);
    expect(resolved[2]?.id).toBe(second.id);
    expect(new Set(resolved.map((preset) => preset.id)).size).toBe(4);
  });

  it('중복·미존재 ID는 무시한다', () => {
    const first = OFFICIAL_SPOMOVE_LIBRARY.find((preset) => preset.isReady)!;
    const resolved = resolveHomeFeaturedSpomove([first.id, first.id, 'not-a-preset', null]);
    expect(resolved[0]?.id).toBe(first.id);
    expect(resolved.filter((preset) => preset.id === first.id)).toHaveLength(1);
    expect(resolved).toHaveLength(4);
  });
});
