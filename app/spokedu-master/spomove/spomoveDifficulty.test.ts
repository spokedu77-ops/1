import { describe, expect, it } from 'vitest';

import { findOfficialSpomovePreset } from './officialSpomovePresets';
import {
  applySpomoveDifficulty,
  colorTrackerEngineToStage,
  colorTrackerStageToEngine,
  getSpomoveDifficultyKind,
  getSpomoveDifficultyOptions,
  readSpomoveDifficultyValue,
} from './spomoveDifficulty';

describe('spomoveDifficulty', () => {
  it('매직 아이(사이먼 4)는 난이도 칩 없음', () => {
    const magic = findOfficialSpomovePreset('visual-reaction-blackout-37')!;
    expect(getSpomoveDifficultyKind(magic)).toBeNull();
  });

  it('흰 공 3단계 ↔ tier+dual 매핑', () => {
    expect(colorTrackerStageToEngine(1)).toEqual({ colorTrackerTier: 1, colorTrackerDualPanel: false });
    expect(colorTrackerStageToEngine(2)).toEqual({ colorTrackerTier: 3, colorTrackerDualPanel: false });
    expect(colorTrackerStageToEngine(3)).toEqual({ colorTrackerTier: 3, colorTrackerDualPanel: true });
    expect(colorTrackerEngineToStage(1, false)).toBe(1);
    expect(colorTrackerEngineToStage(3, false)).toBe(2);
    expect(colorTrackerEngineToStage(3, true)).toBe(3);
  });

  it('흰 공 세션 난이도 apply/read', () => {
    const base = findOfficialSpomovePreset('visual-reaction-color-tracker-l2')!;
    expect(getSpomoveDifficultyKind(base)).toBe('colorTracker');
    expect(getSpomoveDifficultyOptions('colorTracker').map((o) => o.value)).toEqual(['1', '2', '3']);
    expect(readSpomoveDifficultyValue(base, 'colorTracker')).toBe('1');

    const stage3 = applySpomoveDifficulty(base, 'colorTracker', '3');
    expect(stage3.engine.colorTrackerTier).toBe(3);
    expect(stage3.engine.colorTrackerDualPanel).toBe(true);
    expect(readSpomoveDifficultyValue(stage3, 'colorTracker')).toBe('3');

    const stage2 = applySpomoveDifficulty(base, 'colorTracker', '2');
    expect(stage2.engine.colorTrackerTier).toBe(3);
    expect(stage2.engine.colorTrackerDualPanel).toBe(false);
  });

  it('사이먼 폴 도형·화살표 기본/응용', () => {
    const pole = findOfficialSpomovePreset('simon-pole-shape-06')!;
    expect(getSpomoveDifficultyKind(pole)).toBe('simonPole');
    expect(getSpomoveDifficultyOptions('simonPole').map((o) => o.label)).toEqual(['기본', '응용']);
    expect(readSpomoveDifficultyValue(pole, 'simonPole')).toBe('1');

    const advanced = applySpomoveDifficulty(pole, 'simonPole', '2');
    expect(advanced.engine.simonPoleCount).toBe(2);
    expect(readSpomoveDifficultyValue(advanced, 'simonPole')).toBe('2');

    const arrows = findOfficialSpomovePreset('simon-pole-arrows-41')!;
    expect(getSpomoveDifficultyKind(arrows)).toBe('simonPole');
  });
});
