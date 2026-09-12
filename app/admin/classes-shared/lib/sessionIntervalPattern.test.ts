import { describe, expect, it } from 'vitest';

import { buildExtendedStartIsos, nextSessionStartIso, twoWeekdayPattern } from './sessionIntervalPattern';

describe('sessionIntervalPattern', () => {
  const mon = '2026-09-14T01:00:00.000Z'; // 월 10:00 KST
  const wed = '2026-09-16T01:00:00.000Z';
  const nextMon = '2026-09-21T01:00:00.000Z';
  const nextWed = '2026-09-23T01:00:00.000Z';
  const weeklyA = '2026-09-14T01:00:00.000Z';
  const weeklyB = '2026-09-21T01:00:00.000Z';
  const weeklyC = '2026-09-28T01:00:00.000Z';
  const weekMs = 7 * 24 * 60 * 60 * 1000;

  it('월·수는 요일 둘로 본다', () => {
    expect(twoWeekdayPattern([mon, wed, nextMon])).toEqual([1, 3]);
  });

  it('매주 월요일만이면 요일 둘 패턴이 아니다', () => {
    expect(twoWeekdayPattern([weeklyA, weeklyB, weeklyC])).toBeNull();
  });

  it('주 2회 마지막이 수요일이면 다음은 월요일이다', () => {
    expect(nextSessionStartIso(wed, [mon, wed], weekMs)).toBe(nextMon);
  });

  it('주 2회 마지막이 월요일이면 다음은 수요일이다', () => {
    expect(nextSessionStartIso(nextMon, [mon, wed, nextMon], weekMs)).toBe(nextWed);
  });

  it('매주 하루는 fallback 간격을 쓴다', () => {
    expect(nextSessionStartIso(weeklyB, [weeklyA, weeklyB], weekMs)).toBe(weeklyC);
  });

  it('주 2회 확장 4회는 수→월→수→월이다', () => {
    expect(buildExtendedStartIsos(wed, [mon, wed], 4, weekMs)).toEqual([
      nextMon,
      nextWed,
      '2026-09-28T01:00:00.000Z',
      '2026-09-30T01:00:00.000Z',
    ]);
  });
});
