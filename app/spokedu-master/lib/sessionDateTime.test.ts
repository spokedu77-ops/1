import { describe, expect, it } from 'vitest';
import { getSeoulSessionDay, seoulDateTimeInputToIso, toSeoulDateTimeInput } from './sessionDateTime';

describe('Session Asia/Seoul date handling', () => {
  it('roundtrips a 23:30 class without changing its Seoul day', () => {
    const iso = seoulDateTimeInputToIso('2026-08-22T23:30');
    expect(toSeoulDateTimeInput(iso)).toBe('2026-08-22T23:30');
    expect(getSeoulSessionDay(iso)).toBe('2026-08-22');
  });
  it('roundtrips a 00:30 class without moving to the previous day', () => {
    const iso = seoulDateTimeInputToIso('2026-08-23T00:30');
    expect(toSeoulDateTimeInput(iso)).toBe('2026-08-23T00:30');
    expect(getSeoulSessionDay(iso)).toBe('2026-08-23');
  });
});
