import { describe, expect, it } from 'vitest';

import {
  OFFICIAL_SPOMOVE_CORE_COUNT,
  OFFICIAL_SPOMOVE_EXPANSION_COUNT,
  OFFICIAL_SPOMOVE_LIBRARY,
  OFFICIAL_SPOMOVE_LIBRARY_SIZE,
  findOfficialSpomovePreset,
  type OfficialFlowFeatureKey,
} from './officialSpomovePresets';

describe(`OFFICIAL_SPOMOVE_LIBRARY ${OFFICIAL_SPOMOVE_LIBRARY_SIZE}개 확장 계약`, () => {
  it(`OFFICIAL_SPOMOVE_LIBRARY.length === ${OFFICIAL_SPOMOVE_LIBRARY_SIZE}`, () => {
    expect(OFFICIAL_SPOMOVE_LIBRARY).toHaveLength(OFFICIAL_SPOMOVE_LIBRARY_SIZE);
    expect(OFFICIAL_SPOMOVE_CORE_COUNT + OFFICIAL_SPOMOVE_EXPANSION_COUNT).toBe(OFFICIAL_SPOMOVE_LIBRARY_SIZE);
  });

  it('ID가 모두 고유하다', () => {
    const ids = OFFICIAL_SPOMOVE_LIBRARY.map((preset) => preset.id);
    expect(new Set(ids).size).toBe(OFFICIAL_SPOMOVE_LIBRARY_SIZE);
  });

  it('sortOrder가 1부터 연속이다', () => {
    const orders = OFFICIAL_SPOMOVE_LIBRARY.map((preset) => preset.sortOrder).sort((a, b) => a - b);
    expect(orders).toEqual(Array.from({ length: OFFICIAL_SPOMOVE_LIBRARY_SIZE }, (_, index) => index + 1));
  });

  it('모든 preset isReady === true', () => {
    expect(OFFICIAL_SPOMOVE_LIBRARY.every((preset) => preset.isReady)).toBe(true);
  });

  it('변형 사분할은 1~4단계가 easy/hard로 분리된다', () => {
    const variantQuadrants = OFFICIAL_SPOMOVE_LIBRARY.filter(
      (preset) => preset.engine.mode === 'basic' && preset.engine.level >= 7 && preset.engine.level <= 10,
    );
    expect(variantQuadrants).toHaveLength(8);
    for (const level of [7, 8, 9, 10]) {
      const byLevel = variantQuadrants.filter((preset) => preset.engine.level === level);
      expect(byLevel.map((preset) => preset.engine.bodyLabelMode).sort()).toEqual(['easy', 'hard']);
      expect(byLevel.every((preset) => preset.engine.hideBodyLabelModeControls)).toBe(true);
      expect(byLevel.every((preset) => preset.engine.variantColorTheme === 'color')).toBe(true);
      expect(byLevel.find((preset) => preset.engine.bodyLabelMode === 'easy')?.cueSeconds).toBe(5);
      expect(byLevel.find((preset) => preset.engine.bodyLabelMode === 'hard')?.cueSeconds).toBe(6);
    }
  });

  const byGroup = (group: string) => OFFICIAL_SPOMOVE_LIBRARY.filter((preset) => preset.programGroup === group);

  it('그룹별 개수가 확장 목표와 일치한다', () => {
    expect(byGroup('reaction-cognition')).toHaveLength(44);
    expect(byGroup('visual-reaction')).toHaveLength(17);
    expect(byGroup('simon')).toHaveLength(3);
    expect(byGroup('flanker')).toHaveLength(6);
    expect(byGroup('stroop')).toHaveLength(5);
    expect(byGroup('sequential-memory')).toHaveLength(6);
    expect(byGroup('dive')).toHaveLength(5);
    expect(byGroup('bonus')).toHaveLength(1);
  });

  it('반응 인지 L2~L6 테마 조합이 color/fruit/vehicle/emotion/animal/nature/food 7종을 모두 포함한다', () => {
    const themed = byGroup('reaction-cognition').filter(
      (preset) => preset.engine.mode === 'basic' && preset.engine.level >= 2 && preset.engine.level <= 6,
    );
    expect(themed).toHaveLength(35);
    for (const level of [2, 3, 4, 5, 6]) {
      const levelPresets = themed.filter((preset) => preset.engine.level === level);
      expect(levelPresets).toHaveLength(7);
    }
  });

  const vr = byGroup('visual-reaction');
  it('시지각 반응 FLOW concurrent 1/2/3 존재', () => {
    expect(vr.some((preset) => preset.engine.level === 1 && (preset.engine.reactTrainConcurrent ?? 1) === 1)).toBe(true);
    expect(vr.some((preset) => preset.engine.level === 1 && preset.engine.reactTrainConcurrent === 2)).toBe(true);
    expect(vr.some((preset) => preset.engine.level === 1 && preset.engine.reactTrainConcurrent === 3)).toBe(true);
  });

  it('숫자 기차 tier 1/2/3 · 흰 공 tier 1/2/3 · 두더지 2패널이 존재한다', () => {
    expect(vr.some((preset) => preset.engine.numberCartTier === 1)).toBe(true);
    expect(vr.some((preset) => preset.engine.numberCartTier === 2)).toBe(true);
    expect(vr.some((preset) => preset.engine.numberCartTier === 3)).toBe(true);
    expect(vr.some((preset) => preset.engine.colorTrackerTier === 1)).toBe(true);
    expect(vr.some((preset) => preset.engine.colorTrackerTier === 2)).toBe(true);
    expect(vr.some((preset) => preset.engine.colorTrackerTier === 3)).toBe(true);
    expect(vr.some((preset) => preset.engine.moleDualPanel === true)).toBe(true);
  });

  it('기존 9개 legacy ID 유지', () => {
    const legacyIds = [
      'reaction-cognition-space-direction-01',
      'reaction-cognition-quad-color-02',
      'reaction-cognition-full-color-03',
      'reaction-cognition-split-color-04',
      'visual-reaction-flow-05',
      'simon-pole-shape-06',
      'flanker-uniform-07',
      'stroop-arrow-reverse-08',
      'sequential-memory-3color-09',
    ];
    for (const id of legacyIds) {
      expect(findOfficialSpomovePreset(id)).not.toBeNull();
    }
  });

  it('rock 포함 프리셋 0개', () => {
    expect(
      OFFICIAL_SPOMOVE_LIBRARY.filter((preset) =>
        (preset.engine.flowFeatures ?? []).includes('rock' as OfficialFlowFeatureKey),
      ),
    ).toHaveLength(0);
  });

  it('모든 preset에 executionFacts·settingChips·title·description 존재', () => {
    expect(OFFICIAL_SPOMOVE_LIBRARY.every((preset) => preset.executionFacts.length > 0)).toBe(true);
    expect(OFFICIAL_SPOMOVE_LIBRARY.every((preset) => preset.settingChips.length > 0)).toBe(true);
    expect(OFFICIAL_SPOMOVE_LIBRARY.every((preset) => preset.title.trim().length > 0)).toBe(true);
    expect(OFFICIAL_SPOMOVE_LIBRARY.every((preset) => preset.description.trim().length > 0)).toBe(true);
  });
});
