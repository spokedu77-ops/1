import { describe, expect, it } from 'vitest';
import { COUNTDOWN_TIMER_MODE_CONFIG, distributeEvenly, formatCountdownOption, traceLadderDestination } from './classToolsModel';

describe('class tools foundation contracts', () => {
  it('creates two to four randomly ordered teams with at most one member difference', () => {
    const teams = distributeEvenly([1, 2, 3, 4, 5, 6, 7], 3, () => 0.5);
    expect(teams).toHaveLength(3);
    expect(teams.flat().toSorted()).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(Math.max(...teams.map((team) => team.length)) - Math.min(...teams.map((team) => team.length))).toBeLessThanOrEqual(1);
  });

  it('traces one ladder participant independently', () => {
    expect(traceLadderDestination(0, 3, [{ level: 0, left: 0 }, { level: 2, left: 1 }])).toBe(2);
    expect(traceLadderDestination(2, 3, [{ level: 0, left: 0 }, { level: 2, left: 1 }])).toBe(1);
  });

  it('separates activity counting from rest countdown copy', () => {
    expect(COUNTDOWN_TIMER_MODE_CONFIG.activity.supportsCount).toBe(true);
    expect(COUNTDOWN_TIMER_MODE_CONFIG.rest.supportsCount).toBe(false);
    expect(COUNTDOWN_TIMER_MODE_CONFIG.rest.expiredLabel).toBe('휴식 시간이 끝났습니다.');
    expect(COUNTDOWN_TIMER_MODE_CONFIG.activity.options.map(formatCountdownOption)).toEqual(['30초', '1분', '2분', '3분', '5분']);
  });
});
