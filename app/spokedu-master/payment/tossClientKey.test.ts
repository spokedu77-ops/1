import { describe, expect, it } from 'vitest';
import { isTossClientKeyAllowed } from './tossClientKey';

describe('isTossClientKeyAllowed', () => {
  it('rejects test keys in production', () => {
    expect(isTossClientKeyAllowed('test_ck_demo', 'production')).toBe(false);
  });

  it('allows test keys outside production and live keys in production', () => {
    expect(isTossClientKeyAllowed('test_ck_demo', 'development')).toBe(true);
    expect(isTossClientKeyAllowed('test_ck_demo', 'staging')).toBe(true);
    expect(isTossClientKeyAllowed('live_ck_demo', 'production')).toBe(true);
  });
});
