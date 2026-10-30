import { describe, expect, it } from 'vitest';
import {
  COLOR_TRACKER_ROUND_OPTIONS,
  normalizeColorTrackerRounds,
  normalizeNumberCartRounds,
} from './roundNormalization';

describe('White Ball public and legacy execution volume', () => {
  it.each([10, 15, 20, 30])('preserves public selection %i through repeated normalization', (rounds) => {
    expect(normalizeColorTrackerRounds(normalizeColorTrackerRounds(rounds))).toBe(rounds);
  });
  it.each([2, 3, 5, 10])('preserves authored legacy %i rounds', (rounds) => {
    expect(normalizeColorTrackerRounds(rounds)).toBe(rounds);
  });
  it('keeps legacy selector options unchanged', () => {
    expect(COLOR_TRACKER_ROUND_OPTIONS).toEqual([2, 3, 5, 10]);
  });
  it.each([[NaN, 5], [Infinity, 5], [-1, 2], [4, 3], [14, 10], [31, 10]])(
    'keeps the existing invalid-input fallback for %s', (input, expected) => {
      expect(normalizeColorTrackerRounds(input)).toBe(expected);
    },
  );
  it.each([[10, 10], [15, 15], [20, 15], [30, 25]])('does not change Number Cart normalization for %i', (input, expected) => {
    expect(normalizeNumberCartRounds(input)).toBe(expected);
  });
});
