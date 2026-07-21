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
  it('entry 쿼리가 없으면 autostart=1만 Legacy 허용', () => {
    expect(resolveLegacyAutostart({ entryParam: null, autostartParam: '1' })).toBe(true);
    expect(resolveLegacyAutostart({ entryParam: undefined, autostartParam: '1' })).toBe(true);
  });

  it('entry=start|settings 가 있으면 autostart=1도 Setup으로', () => {
    expect(resolveLegacyAutostart({ entryParam: 'start', autostartParam: '1' })).toBe(false);
    expect(resolveLegacyAutostart({ entryParam: 'settings', autostartParam: '1' })).toBe(false);
  });

  it('autostart 없으면 false', () => {
    expect(resolveLegacyAutostart({ entryParam: null, autostartParam: null })).toBe(false);
  });
});

describe('isInteractiveKeyTarget', () => {
  it('null은 interactive가 아님', () => {
    expect(isInteractiveKeyTarget(null)).toBe(false);
  });
});
