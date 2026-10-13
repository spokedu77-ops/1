import { describe, expect, it } from 'vitest';
import { shouldInvalidateMasterAccessIdentity } from './masterAccessIdentity';

describe('retained MASTER access identity', () => {
  it('keeps a verified snapshot only for the same authenticated user', () => {
    expect(shouldInvalidateMasterAccessIdentity('user-a', 'user-a')).toBe(false);
    expect(shouldInvalidateMasterAccessIdentity(null, 'user-a')).toBe(false);
  });

  it('invalidates immediately on logout or account switch', () => {
    expect(shouldInvalidateMasterAccessIdentity('user-a', null)).toBe(true);
    expect(shouldInvalidateMasterAccessIdentity('user-a', 'user-b')).toBe(true);
  });
});
