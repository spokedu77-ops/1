import { describe, expect, it } from 'vitest';
import { resolveDiveThemePresentation } from './diveThemePresentation';
import { buildStages, buildStagePreview } from './stageBuilder';

describe('DIVE theme presentation', () => {
  it('changes presentation without changing sequential/random stage mechanics', () => {
    for (const layout of ['sequential', 'random'] as const) {
      const modules = ['punch', 'kick', 'duck', 'reach'] as const;
      const space = buildStages([...modules], 20, { themeId: 'space', layout });
      const ocean = buildStages([...modules], 20, { themeId: 'ocean', layout });
      const mechanics = (stages: typeof space) => stages.map(({ cueWord, shortInstruction, ...stage }) => {
        void cueWord; void shortInstruction; return stage;
      });
      expect(mechanics(space)).toEqual(mechanics(ocean));
      expect(ocean.map(s => s.shortInstruction).join(' ')).not.toMatch(/우주|UFO|에너지|배럴/);
    }
  });

  it('uses exact authored action instructions and theme-specific preview labels', () => {
    expect(resolveDiveThemePresentation('space', 'reach').shortInstruction).toBe('우주 방벽을 5번 두드려\n부수세요');
    expect(resolveDiveThemePresentation('ocean', 'reach').shortInstruction).toBe('금고문을 5번 두드려\n부수세요');
    expect(resolveDiveThemePresentation('space', 'jump').shortInstruction).toBe('발판이 다가오면\n타이밍에 맞춰 점프하세요');
    expect(resolveDiveThemePresentation('ocean', 'faster').shortInstruction).toBe('속도가 빨라집니다\n리듬에 맞춰 움직이세요');
    const preview = buildStagePreview(['duck'], { themeId: 'ocean' });
    expect(preview[1].presentation.label).toBe('상어 · DUCK');
    expect(resolveDiveThemePresentation('ocean', 'duck').shortInstruction).toBe('상어가 다가오면 몸을 낮춰 피하세요');
    expect(resolveDiveThemePresentation('space', 'duck').shortInstruction).toBe('우주선이 다가오면\n몸을 낮춰 피하세요');
    expect(resolveDiveThemePresentation('ocean', 'bonus').shortInstruction).toBe('지금까지 배운\n모든 동작을 수행하세요');
  });
});
