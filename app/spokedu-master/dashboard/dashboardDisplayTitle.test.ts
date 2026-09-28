import { describe, expect, it } from 'vitest';

import { getDashboardDisplayTitle } from './dashboardDisplayTitle';

describe('Dashboard display title', () => {
  it.each([
    ['사계절 러닝 (Four Seasons Running Adventure)', '사계절 러닝'],
    ['농구 (Basketball)', '농구'],
    ['농구 (2단계)', '농구 (2단계)'],
    ['균형 잡기 (초급)', '균형 잡기 (초급)'],
    ['Four Seasons Running Adventure', 'Four Seasons Running Adventure'],
  ])('maps %s safely', (canonicalTitle, expected) => {
    expect(getDashboardDisplayTitle(canonicalTitle)).toBe(expected);
  });
});
