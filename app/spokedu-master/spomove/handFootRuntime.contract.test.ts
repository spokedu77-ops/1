import { describe, expect, it } from 'vitest';

import { findOfficialSpomovePreset } from './officialSpomovePresets';
import { isHubListedPreset } from './movements/isHubVisiblePreset';
import { getSpomovePresetDisplayModel } from './spomovePresetDisplayModel';

const HAND_FOOT_IDS = [
  'visual-reaction-hand-foot-easy-skeleton',
  'visual-reaction-hand-foot-normal-skeleton',
  'visual-reaction-hand-foot-hard-skeleton',
] as const;

describe('SPOMOVE hand-foot runtime contract (05A)', () => {
  it('keeps programGroup visual-reaction and executes as basic L7 + difficulty', () => {
    const difficulties = HAND_FOOT_IDS.map((id) => {
      const preset = findOfficialSpomovePreset(id);
      expect(preset, id).toBeTruthy();
      expect(isHubListedPreset(preset!)).toBe(true);
      expect(preset!.programGroup).toBe('visual-reaction');
      expect(preset!.catalogStatus).not.toBe('hold');
      expect(preset!.engine).toEqual({
        mode: 'basic',
        level: 7,
        handFootDifficulty: expect.stringMatching(/^(easy|normal|hard)$/),
      });
      return preset!.engine.handFootDifficulty;
    });
    expect(difficulties.sort()).toEqual(['easy', 'hard', 'normal']);
  });

  it('does not leave hand-foot on reactTrain L7 (Wormhole route)', () => {
    for (const id of HAND_FOOT_IDS) {
      const preset = findOfficialSpomovePreset(id)!;
      expect(preset.engine.mode).not.toBe('reactTrain');
    }
  });

  it('hub display resolves Admin catalog id 201 (손 따로, 발 따로)', () => {
    const easy = findOfficialSpomovePreset('visual-reaction-hand-foot-easy-skeleton')!;
    const model = getSpomovePresetDisplayModel(easy);
    expect(model.displayTitle).toContain('손 따로');
    expect(model.displayTitle).toMatch(/쉬움/);
  });
});
