import { describe, expect, it } from 'vitest';
import type { MasterSessionDto } from '../types/operational';
import { resolvePreviousCompletedSession, resolveSessionContinuity } from './masterSessionContinuity';

const make = (id: string, startAt: string, status: MasterSessionDto['status'] = 'completed', classId = 'c1'): MasterSessionDto => ({ id, classId, className: 'A', startAt, startedAt: null, endAt: startAt, status, memo: null, completedAt: status === 'completed' ? startAt : null, programs: [], attendance: [], createdAt: '', updatedAt: '' });
const now = new Date('2026-08-26T08:00:00Z');

describe('Session continuity target', () => {
  it('uses an existing future scheduled Session before creating', () => {
    const source = make('source', '2026-08-20T07:00:00Z');
    expect(resolveSessionContinuity({ sourceSession: source, classSessions: [source, make('next', '2026-08-29T07:00:00Z', 'scheduled')], now })).toMatchObject({ kind: 'existing-upcoming', targetSession: { id: 'next' } });
  });
  it('uses later completed history and only creates at the timeline end', () => {
    const source = make('source', '2026-06-01T07:00:00Z');
    expect(resolveSessionContinuity({ sourceSession: source, classSessions: [source, make('history', '2026-06-08T07:00:00Z')], now }).kind).toBe('historical-next');
    expect(resolveSessionContinuity({ sourceSession: source, classSessions: [source], now }).kind).toBe('create-next');
  });
  it('ignores cancelled and different-Class Sessions', () => {
    const source = make('source', '2026-08-20T07:00:00Z');
    expect(resolveSessionContinuity({ sourceSession: source, classSessions: [source, make('cancelled', '2026-08-29T07:00:00Z', 'cancelled'), make('other', '2026-08-29T07:00:00Z', 'scheduled', 'c2')], now }).kind).toBe('create-next');
  });
  it('prioritizes a later overdue scheduled Session as unresolved', () => {
    const source = make('source', '2026-08-01T07:00:00Z');
    expect(resolveSessionContinuity({ sourceSession: source, classSessions: [source, make('overdue', '2026-08-20T07:00:00Z', 'scheduled')], now }).kind).toBe('existing-unresolved');
  });
  it('resolves the exact immediate previous completed Session for PREP carryover', () => {
    const target = make('target', '2026-08-29T07:00:00Z', 'scheduled');
    expect(resolvePreviousCompletedSession(target, [make('old', '2026-08-10T07:00:00Z'), make('previous', '2026-08-20T07:00:00Z'), target])?.id).toBe('previous');
  });
});
