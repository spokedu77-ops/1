import { describe, expect, it } from 'vitest';
import { sessionDisplayStatus } from './sessionDisplayStatus';

const event = { start: '2026-10-28T14:00:00+09:00', end: '2026-10-28T15:00:00+09:00', status: 'opened' };
describe('calendar time-aware status', () => {
  it('transitions an opened session at its start and end boundaries', () => {
    expect(sessionDisplayStatus(event, Date.parse(event.start) - 1)).toBe('예정');
    expect(sessionDisplayStatus(event, Date.parse(event.start))).toBe('진행중');
    expect(sessionDisplayStatus(event, Date.parse(event.end))).toBe('완료');
  });
  it('keeps cancellation and postponement after the end time', () => {
    for (const [status, label] of [['postponed', '연기'], ['cancelled', '취소'], ['deleted', '취소']]) {
      expect(sessionDisplayStatus({ ...event, status }, Date.parse(event.end) + 1)).toBe(label);
    }
  });
  it('keeps saved completion and supports missing DB status', () => {
    expect(sessionDisplayStatus({ ...event, status: 'verified' }, Date.parse(event.start) - 1)).toBe('완료');
    expect(sessionDisplayStatus({ ...event, status: null }, Date.parse(event.end) + 1)).toBe('완료');
  });
});
