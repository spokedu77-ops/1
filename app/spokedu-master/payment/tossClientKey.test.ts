import { describe, expect, it } from 'vitest';
import { isTossClientKeyAllowed } from './tossClientKey';

describe('isTossClientKeyAllowed', () => {
  it.each(['', 'test_gck_demo', 'live_gck_demo', 'live_ck_', 'live_ck_bad key', 'bogus'])('rejects non-billing or malformed client key %s', (key) => {
    expect(isTossClientKeyAllowed(key, 'development')).toBe(false);
    expect(isTossClientKeyAllowed(key, 'production')).toBe(false);
  });
  it('rejects test keys in production', () => {
    expect(isTossClientKeyAllowed('test_ck_demo', 'production')).toBe(false);
  });

  it('allows test keys outside production and live keys in production', () => {
    expect(isTossClientKeyAllowed('test_ck_demo', 'development')).toBe(true);
    expect(isTossClientKeyAllowed('test_ck_demo', 'staging')).toBe(true);
    expect(isTossClientKeyAllowed('live_ck_demo', 'production')).toBe(true);
  });

  it('uses Vercel environment to distinguish preview from production builds', () => {
    expect(isTossClientKeyAllowed('test_ck_demo', 'production', 'preview')).toBe(true);
    expect(isTossClientKeyAllowed('test_ck_demo', 'production', 'production')).toBe(false);
    expect(isTossClientKeyAllowed('live_ck_demo', 'production', 'production')).toBe(true);
  });
});
