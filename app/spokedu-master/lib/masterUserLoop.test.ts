import { describe, expect, it } from 'vitest';
import { isMasterFirstUser } from './masterUserLoop';

describe('master first-use detection', () => {
  it('treats an empty account as first use', () => {
    expect(isMasterFirstUser({ studentCount: 0, sessionCount: 0, recentLessonActivities: [], recentSpomoveActivities: [] })).toBe(true);
  });

  it('recognizes current students or Session history as existing use', () => {
    expect(isMasterFirstUser({ studentCount: 1, sessionCount: 0, recentLessonActivities: [], recentSpomoveActivities: [] })).toBe(false);
    expect(isMasterFirstUser({ studentCount: 0, sessionCount: 1, recentLessonActivities: [], recentSpomoveActivities: [] })).toBe(false);
  });

  it('recognizes content usage as existing use', () => {
    expect(isMasterFirstUser({
      studentCount: 0,
      sessionCount: 0,
      recentLessonActivities: [{ ownerId: 'owner', programId: 'program', programTitle: 'Program', action: 'lesson_opened', occurredAt: '2026-08-25T00:00:00.000Z' }],
      recentSpomoveActivities: [],
    })).toBe(false);
  });
});
