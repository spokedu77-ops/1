import { describe, expect, it } from 'vitest';
import { resolvePreviousSessionCarryover } from './previousSessionMemory';

describe('resolvePreviousSessionCarryover', () => {
  const sessions = [
    {
      id: 's1',
      classId: 'c1',
      status: 'completed',
      startAt: '2026-08-01T01:00:00.000Z',
      memo: '첫 주: 규칙 익히기',
    },
    {
      id: 's2',
      classId: 'c1',
      status: 'completed',
      startAt: '2026-08-08T01:00:00.000Z',
      memo: '둘째 주: 패스 집중',
    },
    {
      id: 's3',
      classId: 'c1',
      status: 'scheduled',
      startAt: '2026-08-15T01:00:00.000Z',
      memo: null,
    },
    {
      id: 'other',
      classId: 'c2',
      status: 'completed',
      startAt: '2026-08-10T01:00:00.000Z',
      memo: '다른 반 메모',
    },
  ];

  it('returns the latest completed memo for the same class (second-session memory)', () => {
    expect(resolvePreviousSessionCarryover(sessions, 'c1', 's3')).toEqual({
      sessionId: 's2',
      startAt: '2026-08-08T01:00:00.000Z',
      memo: '둘째 주: 패스 집중',
    });
  });

  it('ignores blank memos and other classes', () => {
    expect(resolvePreviousSessionCarryover([
      { id: 'blank', classId: 'c1', status: 'completed', startAt: '2026-08-20T01:00:00.000Z', memo: '   ' },
      { id: 'kept', classId: 'c1', status: 'completed', startAt: '2026-08-10T01:00:00.000Z', memo: '유지' },
    ], 'c1', null)?.memo).toBe('유지');
    expect(resolvePreviousSessionCarryover(sessions, 'c2', null)?.memo).toBe('다른 반 메모');
  });

  it('returns null when there is no reusable memory', () => {
    expect(resolvePreviousSessionCarryover([], 'c1', null)).toBeNull();
    expect(resolvePreviousSessionCarryover(sessions, '', 's3')).toBeNull();
  });
});
