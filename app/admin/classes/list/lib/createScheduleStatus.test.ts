import { describe, expect, it } from 'vitest';
import { initialSessionStatus } from './createSchedule';

describe('historical class creation follows the existing auto-finish rule', () => {
  const now = Date.parse('2026-11-01T05:00:00+09:00');
  it('immediately completes past classes regardless of timestamp offset', () => {
    expect(initialSessionStatus(new Date('2026-10-25T18:00:00+09:00'), now)).toBe('finished');
    expect(initialSessionStatus(new Date('2026-10-25T09:00:00Z'), now)).toBe('finished');
    expect(initialSessionStatus(new Date(now), now)).toBe('finished');
  });
  it('keeps ongoing and future classes open until their end', () => {
    expect(initialSessionStatus(new Date(now + 1), now)).toBe('opened');
    expect(initialSessionStatus(new Date('2026-11-02T18:00:00+09:00'), now)).toBe('opened');
  });
});
