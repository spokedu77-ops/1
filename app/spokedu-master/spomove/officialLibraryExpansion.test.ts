import { describe, expect, it } from 'vitest';
import {
  OFFICIAL_SPOMOVE_LIBRARY,
  findOfficialSpomovePreset,
  type OfficialFlowFeatureKey,
} from './officialSpomovePresets';

const LIBRARY_SIZE = 46;

describe(`OFFICIAL_SPOMOVE_LIBRARY ${LIBRARY_SIZE}개 TOP50 curation 계약`, () => {
  it(`OFFICIAL_SPOMOVE_LIBRARY.length === ${LIBRARY_SIZE}`, () => {
    expect(OFFICIAL_SPOMOVE_LIBRARY).toHaveLength(LIBRARY_SIZE);
  });
  it(`ID ${LIBRARY_SIZE}개 모두 고유`, () => {
    const ids = OFFICIAL_SPOMOVE_LIBRARY.map((p) => p.id);
    expect(new Set(ids).size).toBe(LIBRARY_SIZE);
  });
  it(`sortOrder ${LIBRARY_SIZE}개 모두 고유`, () => {
    const orders = OFFICIAL_SPOMOVE_LIBRARY.map((p) => p.sortOrder);
    expect(new Set(orders).size).toBe(LIBRARY_SIZE);
  });
  it('sortOrder가 1~46 연속', () => {
    const orders = OFFICIAL_SPOMOVE_LIBRARY.map((p) => p.sortOrder).sort((a, b) => a - b);
    expect(orders).toEqual(Array.from({ length: LIBRARY_SIZE }, (_, i) => i + 1));
  });
  it('모든 preset isReady === true', () => {
    expect(OFFICIAL_SPOMOVE_LIBRARY.every((p) => p.isReady)).toBe(true);
  });

  const byGroup = (g: string) => OFFICIAL_SPOMOVE_LIBRARY.filter((p) => p.programGroup === g);
  it('reaction-cognition === 14', () => { expect(byGroup('reaction-cognition')).toHaveLength(14); });
  it('visual-reaction === 12', () => { expect(byGroup('visual-reaction')).toHaveLength(12); });
  it('simon === 2', () => { expect(byGroup('simon')).toHaveLength(2); });
  it('flanker === 4', () => { expect(byGroup('flanker')).toHaveLength(4); });
  it('stroop === 5', () => { expect(byGroup('stroop')).toHaveLength(5); });
  it('sequential-memory === 4', () => { expect(byGroup('sequential-memory')).toHaveLength(4); });
  it('dive === 4', () => { expect(byGroup('dive')).toHaveLength(4); });
  it('bonus === 1', () => { expect(byGroup('bonus')).toHaveLength(1); });

  const rc = byGroup('reaction-cognition');
  it('basic L1~L10 각 1개', () => {
    for (let lv = 1; lv <= 10; lv += 1) {
      expect(rc.filter((p) => p.engine.level === lv)).toHaveLength(1);
    }
  });

  const vr = byGroup('visual-reaction');
  it('FLOW concurrent 1/2/3 존재', () => {
    expect(vr.some((p) => p.engine.level === 1 && (p.engine.reactTrainConcurrent ?? 1) === 1)).toBe(true);
    expect(vr.some((p) => p.engine.level === 1 && p.engine.reactTrainConcurrent === 2)).toBe(true);
    expect(vr.some((p) => p.engine.level === 1 && p.engine.reactTrainConcurrent === 3)).toBe(true);
  });
  it('reactTrain level 2~10 각 1개', () => {
    for (const lv of [2, 3, 4, 5, 6, 7, 8, 9, 10]) {
      expect(vr.filter((p) => p.engine.level === lv)).toHaveLength(1);
    }
  });
  it('숫자 기차 numberCartTier 2 · 5라운드', () => {
    const cart = findOfficialSpomovePreset('visual-reaction-number-cart-42');
    expect(cart?.engine.numberCartTier).toBe(2);
    expect(cart?.rounds).toBe(5);
  });
  it('컬러 트래커 colorTrackerTier 2', () => {
    const tracker = findOfficialSpomovePreset('visual-reaction-color-tracker-43');
    expect(tracker?.engine.colorTrackerTier).toBe(2);
  });

  const dive = byGroup('dive');
  it('jump 존재 (features 없음)', () => {
    expect(dive.some((p) => (p.engine.flowFeatures ?? []).length === 0)).toBe(true);
  });
  it('jump+faster 단독 없음 (보너스에 흡수)', () => {
    expect(dive.some((p) => {
      const f = p.engine.flowFeatures ?? [];
      return f.includes('faster') && f.length === 1;
    })).toBe(false);
  });
  it('rock 포함 프리셋 0개', () => {
    expect(
      OFFICIAL_SPOMOVE_LIBRARY.filter((p) =>
        (p.engine.flowFeatures ?? []).includes('rock' as OfficialFlowFeatureKey),
      ),
    ).toHaveLength(0);
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

  it('모든 preset에 executionFacts·settingChips·title·description 존재', () => {
    expect(OFFICIAL_SPOMOVE_LIBRARY.every((p) => p.executionFacts.length > 0)).toBe(true);
    expect(OFFICIAL_SPOMOVE_LIBRARY.every((p) => p.settingChips.length > 0)).toBe(true);
    expect(OFFICIAL_SPOMOVE_LIBRARY.every((p) => p.title.trim().length > 0)).toBe(true);
    expect(OFFICIAL_SPOMOVE_LIBRARY.every((p) => p.description.trim().length > 0)).toBe(true);
  });
});
