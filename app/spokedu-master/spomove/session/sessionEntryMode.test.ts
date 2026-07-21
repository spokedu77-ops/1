import { describe, expect, it } from 'vitest';

import {
  isInteractiveKeyTarget,
  parseSessionEntryMode,
  resolveLegacyAutostart,
} from './sessionEntryMode';

describe('parseSessionEntryMode', () => {
  it('settings만 settings, 그 외는 start', () => {
    expect(parseSessionEntryMode('settings')).toBe('settings');
    expect(parseSessionEntryMode('start')).toBe('start');
    expect(parseSessionEntryMode(null)).toBe('start');
    expect(parseSessionEntryMode(undefined)).toBe('start');
    expect(parseSessionEntryMode('')).toBe('start');
  });
});

describe('resolveLegacyAutostart', () => {
  it('entry=settings면 autostart=1도 무시', () => {
    expect(
      resolveLegacyAutostart({ entryMode: 'settings', autostartParam: '1' }),
    ).toBe(false);
  });

  it('entry=start면 autostart=1을 Legacy로 허용', () => {
    expect(resolveLegacyAutostart({ entryMode: 'start', autostartParam: '1' })).toBe(true);
    expect(resolveLegacyAutostart({ entryMode: 'start', autostartParam: null })).toBe(false);
  });
});

describe('isInteractiveKeyTarget', () => {
  it('null은 interactive가 아님', () => {
    expect(isInteractiveKeyTarget(null)).toBe(false);
  });
});
