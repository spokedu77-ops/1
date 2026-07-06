import { describe, expect, it } from 'vitest';
import {
  OFFICIAL_SPOMOVE_LIBRARY,
  findOfficialSpomovePreset,
  type OfficialFlowFeatureKey,
} from './officialSpomovePresets';

describe('OFFICIAL_SPOMOVE_LIBRARY 60개 확장 계약', () => {
  // A. 전체 개수
  it('OFFICIAL_SPOMOVE_LIBRARY.length === 60', () => {
    expect(OFFICIAL_SPOMOVE_LIBRARY).toHaveLength(60);
  });
  it('ID 60개 모두 고유', () => {
    const ids = OFFICIAL_SPOMOVE_LIBRARY.map(p => p.id);
    expect(new Set(ids).size).toBe(60);
  });
  it('sortOrder 60개 모두 고유', () => {
    const orders = OFFICIAL_SPOMOVE_LIBRARY.map(p => p.sortOrder);
    expect(new Set(orders).size).toBe(60);
  });
  it('sortOrder가 1~60', () => {
    const orders = OFFICIAL_SPOMOVE_LIBRARY.map(p => p.sortOrder).sort((a, b) => a - b);
    expect(orders).toEqual(Array.from({ length: 60 }, (_, i) => i + 1));
  });
  it('모든 preset isReady === true', () => {
    expect(OFFICIAL_SPOMOVE_LIBRARY.every(p => p.isReady)).toBe(true);
  });

  // B. 그룹별 개수
  const byGroup = (g: string) => OFFICIAL_SPOMOVE_LIBRARY.filter(p => p.programGroup === g);
  it('reaction-cognition === 25', () => { expect(byGroup('reaction-cognition')).toHaveLength(25); });
  it('visual-reaction === 11', () => { expect(byGroup('visual-reaction')).toHaveLength(11); });
  it('simon === 2', () => { expect(byGroup('simon')).toHaveLength(2); });
  it('flanker === 6', () => { expect(byGroup('flanker')).toHaveLength(6); });
  it('stroop === 5', () => { expect(byGroup('stroop')).toHaveLength(5); });
  it('sequential-memory === 5', () => { expect(byGroup('sequential-memory')).toHaveLength(5); });
  it('dive === 5', () => { expect(byGroup('dive')).toHaveLength(5); });
  it('bonus === 1', () => { expect(byGroup('bonus')).toHaveLength(1); });

  // C. 반응 인지 매트릭스
  const rc = byGroup('reaction-cognition');
  const themes = ['color', 'fruit', 'vehicle', 'emotion', 'animal', 'nature'] as const;
  it('공간 방향 1개', () => {
    expect(rc.filter(p => p.engine.level === 1)).toHaveLength(1);
  });
  it('6개 테마 모두 존재', () => {
    const usedThemes = new Set(rc.filter(p => p.engine.level !== 1).map(p => p.engine.variantColorTheme));
    expect(themes.every(t => usedThemes.has(t))).toBe(true);
  });
  for (const theme of themes) {
    it(`테마 ${theme}: 사분할(level 2) 1개`, () => {
      expect(rc.filter(p => p.engine.level === 2 && p.engine.variantColorTheme === theme)).toHaveLength(1);
    });
    it(`테마 ${theme}: 전면(level 3) 1개`, () => {
      expect(rc.filter(p => p.engine.level === 3 && p.engine.variantColorTheme === theme)).toHaveLength(1);
    });
    it(`테마 ${theme}: 2패널(level 4) 1개`, () => {
      expect(rc.filter(p => p.engine.level === 4 && p.engine.variantColorTheme === theme)).toHaveLength(1);
    });
    it(`테마 ${theme}: 3패널(level 5) 1개`, () => {
      expect(rc.filter(p => p.engine.level === 5 && p.engine.variantColorTheme === theme)).toHaveLength(1);
    });
  }
  it('level 6 프리셋 없음 (reaction-cognition)', () => {
    expect(rc.filter(p => p.engine.level === 6)).toHaveLength(0);
  });
  it('테마+표현 조합 중복 없음', () => {
    const combos = rc.filter(p => p.engine.level !== 1).map(p => `${p.engine.level}-${p.engine.variantColorTheme}`);
    expect(new Set(combos).size).toBe(combos.length);
  });

  // D. 시지각 반응
  const vr = byGroup('visual-reaction');
  it('FLOW concurrent 1 존재', () => {
    expect(vr.some(p => p.engine.level === 1 && (p.engine.reactTrainConcurrent ?? 1) === 1)).toBe(true);
  });
  it('FLOW concurrent 2 존재', () => {
    expect(vr.some(p => p.engine.level === 1 && p.engine.reactTrainConcurrent === 2)).toBe(true);
  });
  it('FLOW concurrent 3 존재', () => {
    expect(vr.some(p => p.engine.level === 1 && p.engine.reactTrainConcurrent === 3)).toBe(true);
  });
  it('level 2~9 각각 1개', () => {
    for (let lv = 2; lv <= 9; lv++) {
      expect(vr.filter(p => p.engine.level === lv)).toHaveLength(1);
    }
  });

  // E. 다이브
  const dive = byGroup('dive');
  const bonus = byGroup('bonus');
  it('jump 존재 (features 없음)', () => {
    expect(dive.some(p => (p.engine.flowFeatures ?? []).length === 0)).toBe(true);
  });
  it('jump+faster 존재', () => {
    expect(dive.some(p => {
      const f = p.engine.flowFeatures ?? [];
      return f.includes('faster') && f.length === 1;
    })).toBe(true);
  });
  it('jump+punch 존재', () => {
    expect(dive.some(p => {
      const f = p.engine.flowFeatures ?? [];
      return f.includes('punch') && f.length === 1;
    })).toBe(true);
  });
  it('jump+duck 존재', () => {
    expect(dive.some(p => {
      const f = p.engine.flowFeatures ?? [];
      return f.includes('duck') && f.length === 1;
    })).toBe(true);
  });
  it('jump+reach 존재', () => {
    expect(dive.some(p => {
      const f = p.engine.flowFeatures ?? [];
      return f.includes('reach') && f.length === 1;
    })).toBe(true);
  });
  it('rock 포함 프리셋 0개', () => {
    const all = OFFICIAL_SPOMOVE_LIBRARY;
    expect(all.filter(p => (p.engine.flowFeatures ?? []).includes('rock' as OfficialFlowFeatureKey))).toHaveLength(0);
  });
  it('보너스가 60초 (flowDuration)', () => {
    const b = bonus[0]!;
    expect(b.engine.flowDuration).toBe(60);
  });
  it('보너스 features에 rock 없음', () => {
    const b = bonus[0]!;
    expect((b.engine.flowFeatures ?? []).includes('rock' as OfficialFlowFeatureKey)).toBe(false);
  });

  // F. 기존 호환성
  it('기존 9개 ID 모두 유지', () => {
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
  it('basic level 5 존재 (clamp 제거)', () => {
    expect(OFFICIAL_SPOMOVE_LIBRARY.some(p => p.engine.mode === 'basic' && p.engine.level === 5)).toBe(true);
  });
  it('spatial level 4 존재 (clamp 제거)', () => {
    expect(OFFICIAL_SPOMOVE_LIBRARY.some(p => p.engine.mode === 'spatial' && p.engine.level === 4)).toBe(true);
  });
  it('spatial level 5 존재 (clamp 제거)', () => {
    expect(OFFICIAL_SPOMOVE_LIBRARY.some(p => p.engine.mode === 'spatial' && p.engine.level === 5)).toBe(true);
  });
  it('reactTrain level 2~7 각각 존재', () => {
    for (let lv = 2; lv <= 7; lv++) {
      expect(OFFICIAL_SPOMOVE_LIBRARY.some(p => p.engine.mode === 'reactTrain' && p.engine.level === lv)).toBe(true);
    }
  });

  // G. 실행 정보
  it('모든 preset에 executionFacts 존재 (비어있지 않음)', () => {
    expect(OFFICIAL_SPOMOVE_LIBRARY.every(p => Array.isArray(p.executionFacts) && p.executionFacts.length > 0)).toBe(true);
  });
  it('settingChips 비어있는 preset 없음', () => {
    expect(OFFICIAL_SPOMOVE_LIBRARY.every(p => p.settingChips.length > 0)).toBe(true);
  });
  it('title 비어있는 preset 없음', () => {
    expect(OFFICIAL_SPOMOVE_LIBRARY.every(p => p.title.trim().length > 0)).toBe(true);
  });
  it('description 비어있는 preset 없음', () => {
    expect(OFFICIAL_SPOMOVE_LIBRARY.every(p => p.description.trim().length > 0)).toBe(true);
  });
  it('recommendedUse 비어있는 preset 없음', () => {
    expect(OFFICIAL_SPOMOVE_LIBRARY.every(p => p.recommendedUse.trim().length > 0)).toBe(true);
  });
});
