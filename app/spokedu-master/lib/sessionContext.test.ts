import { describe, expect, it } from 'vitest';
import type { MasterSessionDto } from '../types/operational';
import { findExactSession, resolveReportSession } from './sessionContext';

function session(id: string, classId: string, status: MasterSessionDto['status']): MasterSessionDto {
  return {
    id,
    classId,
    className: classId,
    startAt: '2026-08-24T01:00:00.000Z',
    startedAt: null,
    endAt: '2026-08-24T02:00:00.000Z',
    status,
    memo: null,
    completedAt: status === 'completed' ? '2026-08-24T02:00:00.000Z' : null,
    programs: [],
    attendance: [],
    createdAt: '2026-08-24T00:00:00.000Z',
    updatedAt: '2026-08-24T00:00:00.000Z',
  };
}

describe('MASTER Session context routing', () => {
  const sessions = [
    session('session-a1', 'class-a', 'completed'),
    session('session-a2', 'class-a', 'scheduled'),
    session('session-b1', 'class-b', 'completed'),
  ];

  it('resolves the exact Session even when the same Class has multiple Sessions', () => {
    expect(findExactSession(sessions, 'session-a2')?.id).toBe('session-a2');
    expect(findExactSession(sessions, 'missing')).toBeNull();
  });

  it('uses only the exact completed Session for an explicit report query', () => {
    expect(resolveReportSession(sessions, 'session-b1', '')?.id).toBe('session-b1');
    expect(resolveReportSession(sessions, 'session-a2', '')).toBeNull();
    expect(resolveReportSession(sessions, 'missing', '')).toBeNull();
  });

  it('preserves standalone report selection and recent-completed fallback without a query', () => {
    expect(resolveReportSession(sessions, null, 'session-b1')?.id).toBe('session-b1');
    expect(resolveReportSession(sessions, null, '')?.id).toBe('session-a1');
  });
});
