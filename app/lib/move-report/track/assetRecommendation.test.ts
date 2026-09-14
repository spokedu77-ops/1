import { describe, expect, it } from 'vitest';
import { rankSpecialPeAssets, type SpecialPeAsset } from './assetRecommendation';

function asset(
  mapId: number,
  stage: SpecialPeAsset['stage'],
  levelMin: number,
  levelMax: number,
  priority = 10,
): SpecialPeAsset {
  return {
    map_id: mapId,
    primary_skill: '점프·착지',
    stage,
    source_type: 'master',
    level_min: levelMin,
    level_max: levelMax,
    priority,
    adaptation_note: null,
    title: `asset-${mapId}`,
    url: null,
    thumbnail_url: null,
    equipment: [],
    source_label: null,
    variation_method: null,
    curriculum_id: mapId,
    personal_curriculum_id: null,
  };
}

describe('special PE asset recommendations', () => {
  const assets = [
    asset(1, 'foundation', 1, 2),
    asset(2, 'generalize', 1, 4),
    asset(3, 'challenge', 2, 5),
    asset(4, 'transfer', 2, 5),
  ];

  it('prefers the requested stage when levels are compatible', () => {
    expect(rankSpecialPeAssets(assets, { level: 3, direction: 'advance' })[0]?.stage).toBe('challenge');
    expect(rankSpecialPeAssets(assets, { level: 3, direction: 'transfer' })[0]?.stage).toBe('transfer');
  });

  it('does not put an incompatible foundation activity ahead of a compatible activity', () => {
    const ranked = rankSpecialPeAssets(assets, { level: 4, direction: 'adjust' });
    expect(ranked[0]?.stage).toBe('generalize');
    expect(ranked[ranked.length - 1]?.stage).toBe('foundation');
  });

  it('keeps early-level recommendations inside the supported range', () => {
    const ranked = rankSpecialPeAssets(assets, { level: 1, direction: 'transfer' });
    expect(ranked[0]?.stage).toBe('generalize');
    expect(ranked[1]?.stage).toBe('foundation');
  });

  it('respects asset priority after level and stage', () => {
    const ranked = rankSpecialPeAssets(
      [asset(10, 'generalize', 1, 5, 20), asset(11, 'generalize', 1, 5, 5)],
      { level: 2, direction: 'generalize' },
    );
    expect(ranked.map((item) => item.map_id)).toEqual([11, 10]);
  });
});
