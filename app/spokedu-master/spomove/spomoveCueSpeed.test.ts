import { describe, expect, it } from 'vitest';

import { OFFICIAL_SPOMOVE_LIBRARY, findOfficialSpomovePreset } from './officialSpomovePresets';
import {
  clampCueSpeedSec,
  supportsCueSpeedOverride,
} from './spomoveCueSpeed';

describe('spomoveCueSpeed', () => {
  it('clamps to integer 2~6', () => {
    expect(clampCueSpeedSec(1)).toBe(2);
    expect(clampCueSpeedSec(3)).toBe(3);
    expect(clampCueSpeedSec(7)).toBe(6);
    expect(clampCueSpeedSec(4.4)).toBe(4);
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
});
