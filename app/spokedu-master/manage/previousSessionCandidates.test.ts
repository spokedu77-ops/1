import { describe, expect, it } from 'vitest';
import type { MasterSessionDto } from '../types/operational';
import { resolvePreviousSessionCandidates } from './previousSessionCandidates';

function session(id: string, classId: string, startAt: string, status: MasterSessionDto['status'] = 'completed'): MasterSessionDto {
  return {
    id,
    classId,
    className: classId,
    startAt,
    startedAt: null,
    endAt: new Date(new Date(startAt).getTime() + 60 * 60 * 1000).toISOString(),
    status,
    memo: null,
    completedAt: status === 'completed' ? startAt : null,
    programs: [],
    attendance: [],
    createdAt: startAt,
    updatedAt: startAt,
  };
}

describe('calendar previous Session candidates', () => {
  const sessions = [
    session('a-old', 'class-a', '2026-09-10T07:00:00.000Z'),
    session('a-latest', 'class-a', '2026-09-17T07:00:00.000Z'),
    session('b-latest', 'class-b', '2026-09-16T06:30:00.000Z'),
    session('scheduled', 'class-c', '2026-09-15T08:00:00.000Z', 'scheduled'),
    session('cancelled', 'class-d', '2026-09-14T08:00:00.000Z', 'cancelled'),
    session('target-day', 'class-e', '2026-09-24T01:00:00.000Z'),
    session('future', 'class-f', '2026-09-25T01:00:00.000Z'),
  ];

  it('returns only the latest completed Session per class before the target day', () => {
    expect(resolvePreviousSessionCandidates(sessions, '2026-09-24').map((item) => item.id))
      .toEqual(['a-latest', 'b-latest']);
  });

  it('sorts candidates by source Session date descending', () => {
    const result = resolvePreviousSessionCandidates(sessions, '2026-09-24');
    expect(result[0]!.startAt > result[1]!.startAt).toBe(true);
  });

  it('returns no candidates when there is no earlier completed Session', () => {
    expect(resolvePreviousSessionCandidates(sessions, '2026-09-01')).toEqual([]);
  });
});
