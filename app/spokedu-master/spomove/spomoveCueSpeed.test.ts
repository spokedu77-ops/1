import { describe, expect, it } from 'vitest';

import { OFFICIAL_SPOMOVE_LIBRARY, findOfficialSpomovePreset } from './officialSpomovePresets';
import {
  clampCueSpeedSec,
  formatCueSpeedTargetLabel,
  getCueSpeedGuide,
  parseCueSecondsQuery,
  recommendedCueSecondsForPreset,
  resolveSessionCueSeconds,
  supportsCueSpeedOverride,
} from './spomoveCueSpeed';
import { officialPresetSessionHref } from './officialSpomovePresets';

describe('spomoveCueSpeed', () => {
  it('clamps to integer 2~6', () => {
    expect(clampCueSpeedSec(1)).toBe(2);
    expect(clampCueSpeedSec(3)).toBe(3);
    expect(clampCueSpeedSec(7)).toBe(6);
    expect(clampCueSpeedSec(4.4)).toBe(4);
  });

  it('exposes tempo and target guidance for every cue second', () => {
    for (const sec of [2, 3, 4, 5, 6] as const) {
      const guide = getCueSpeedGuide(sec);
      expect(guide.sec).toBe(sec);
      expect(guide.tempoLabel.length).toBeGreaterThan(0);
      expect(guide.summary.length).toBeGreaterThan(0);
      expect(guide.reason.length).toBeGreaterThan(0);
      expect(guide.recommendTargets.length).toBeGreaterThan(0);
      expect(formatCueSpeedTargetLabel(guide.recommendTargets)).not.toContain('undefined');
      expect(formatCueSpeedTargetLabel(guide.recommendTargets)).not.toMatch(/초저|초고/);
    }
  });

  it('recommends slower cue for easy preschool-leaning presets', () => {
    const easy = findOfficialSpomovePreset('reaction-cognition-mq1-32');
    expect(easy).toBeTruthy();
    expect(recommendedCueSecondsForPreset(easy!)).toBeGreaterThanOrEqual(4);
  });

  it('excludes dive, sequential memory, wormhole, number cart, color tracker', () => {
    expect(supportsCueSpeedOverride(findOfficialSpomovePreset('dive-standard')!)).toBe(false);
    expect(supportsCueSpeedOverride(findOfficialSpomovePreset('sequential-memory-3color-09')!)).toBe(false);
    expect(supportsCueSpeedOverride(findOfficialSpomovePreset('visual-reaction-wormhole-41')!)).toBe(false);
    expect(supportsCueSpeedOverride(findOfficialSpomovePreset('visual-reaction-number-cart-l2')!)).toBe(false);
    expect(supportsCueSpeedOverride(findOfficialSpomovePreset('visual-reaction-color-tracker-l2')!)).toBe(false);
  });

  it('includes reaction cognition / flanker / typical visual reaction', () => {
    expect(supportsCueSpeedOverride(findOfficialSpomovePreset('reaction-cognition-space-direction-01')!)).toBe(true);
    expect(supportsCueSpeedOverride(findOfficialSpomovePreset('flanker-uniform-07')!)).toBe(true);
    expect(supportsCueSpeedOverride(findOfficialSpomovePreset('visual-reaction-flow-05')!)).toBe(true);
    expect(supportsCueSpeedOverride(findOfficialSpomovePreset('visual-reaction-mole-l1')!)).toBe(true);
  });

  it('library has both supported and unsupported presets', () => {
    const supported = OFFICIAL_SPOMOVE_LIBRARY.filter(supportsCueSpeedOverride);
    const unsupported = OFFICIAL_SPOMOVE_LIBRARY.filter((preset) => !supportsCueSpeedOverride(preset));
    expect(supported.length).toBeGreaterThan(20);
    expect(unsupported.length).toBeGreaterThan(5);
  });

  it('resolveSessionCueSeconds prefers valid URL cue over preset default', () => {
    const preset = findOfficialSpomovePreset('reaction-cognition-space-direction-01')!;
    expect(resolveSessionCueSeconds(preset, 5)).toBe(5);
    expect(resolveSessionCueSeconds(preset, 99)).toBe(6);
    expect(parseCueSecondsQuery('4')).toBe(4);
    expect(parseCueSecondsQuery('nope')).toBeNull();
  });

  it('session href can attach movement, cue, autostart, and difficulty', () => {
    const preset = findOfficialSpomovePreset('reaction-cognition-space-direction-01')!;
    const href = officialPresetSessionHref(preset, {
      autostart: true,
      movement: 'handTouch',
      limb: 'free',
      cueSeconds: 4,
      difficulty: '2',
    });
    expect(href).toContain('autostart=1');
    expect(href).toContain('movement=handTouch');
    expect(href).toContain('limb=free');
    expect(href).toContain('cueSeconds=4');
    expect(href).toContain('difficulty=2');
    const settingsHref = officialPresetSessionHref(preset, {
      movement: 'footTap',
      limb: 'free',
      cueSeconds: 3,
    });
    expect(settingsHref).not.toContain('autostart=');
  });
});
