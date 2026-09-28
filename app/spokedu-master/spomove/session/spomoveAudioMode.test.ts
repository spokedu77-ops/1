import { describe, expect, it } from 'vitest';

import {
  legacyPairToSpomoveAudioMode,
  parseSpomoveAudioMode,
  spomoveAudioModeToChannels,
  spomoveAudioModeToLegacyPair,
  userAudioModeWithBgmAvailability,
} from './spomoveAudioMode';

describe('SPOMOVE audio mode compatibility', () => {
  it.each([
    [true, 'music/a.mp3', 'full'],
    [true, '', 'effects'],
    [false, '', 'silent'],
    [false, 'music/a.mp3', 'music'],
  ] as const)('maps legacy pair %s + %s to %s', (soundEnabled, bgmPath, expected) => {
    expect(legacyPairToSpomoveAudioMode(soundEnabled, bgmPath)).toBe(expected);
  });

  it.each([
    ['full', { effectsEnabled: true, bgmEnabled: true }],
    ['effects', { effectsEnabled: true, bgmEnabled: false }],
    ['silent', { effectsEnabled: false, bgmEnabled: false }],
    ['music', { effectsEnabled: false, bgmEnabled: true }],
  ] as const)('maps %s to runtime channels', (mode, expected) => {
    expect(spomoveAudioModeToChannels(mode)).toEqual(expected);
  });

  it.each([
    ['full', { soundEnabled: true, bgmPath: 'music/a.mp3' }],
    ['effects', { soundEnabled: true, bgmPath: '' }],
    ['silent', { soundEnabled: false, bgmPath: '' }],
    ['music', { soundEnabled: false, bgmPath: 'music/a.mp3' }],
  ] as const)('round-trips %s through the existing snapshot pair', (mode, expected) => {
    expect(spomoveAudioModeToLegacyPair(mode, 'music/a.mp3')).toEqual(expected);
    expect(legacyPairToSpomoveAudioMode(expected.soundEnabled, expected.bgmPath)).toBe(mode);
  });

  it('accepts only supported URL values', () => {
    expect(parseSpomoveAudioMode('music')).toBe('music');
    expect(parseSpomoveAudioMode('invalid')).toBeNull();
    expect(parseSpomoveAudioMode(null)).toBeNull();
  });

  it('degrades full to effects when no BGM is available', () => {
    expect(userAudioModeWithBgmAvailability('full', false)).toBe('effects');
    expect(userAudioModeWithBgmAvailability('silent', false)).toBe('silent');
  });
});