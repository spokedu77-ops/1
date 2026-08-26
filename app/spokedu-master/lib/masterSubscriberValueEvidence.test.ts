import { describe, expect, it } from 'vitest';
import { buildMasterSubscriberValueView, getMasterValueRange, resolveMasterActivationNeed } from './masterSubscriberValueEvidence';

const evidence = { scope: { from: '', to: '', label: '최근 30일' as const }, operating: { completedSessions: 8, sessionsWithAttendance: 7, upcomingSessions: 3, activeClasses: 2 }, memory: { available: true, sessionsWithMemo: 5, captureSessions: 4, studentObservations: 11, nextSessionNotes: 3 }, preserved: { totalClasses: 2, totalSessions: 12 } };

describe('subscriber value evidence', () => {
  it('derives activation without persisted onboarding state', () => {
    expect(resolveMasterActivationNeed({ classCount: 0, sessions: [] })).toBe('create-class');
    expect(resolveMasterActivationNeed({ classCount: 1, sessions: [] })).toBe('create-session');
    expect(resolveMasterActivationNeed({ classCount: 1, sessions: [{ status: 'scheduled', programs: [] }] })).toBe('prepare-session');
    expect(resolveMasterActivationNeed({ classCount: 1, sessions: [{ status: 'completed', programs: [] }] })).toBe('none');
  });
  it('uses operating facts for Lite and adds memory facts only for Premium', () => {
    expect(buildMasterSubscriberValueView({ evidence, plan: 'lite' }).lines.map((item) => item.label)).not.toContain('학생 관찰');
    expect(buildMasterSubscriberValueView({ evidence, plan: 'premium' }).lines.map((item) => item.label)).toContain('학생 관찰');
  });
  it('anchors the recent 30 day range to the Seoul calendar boundary', () => {
    expect(getMasterValueRange(new Date('2026-08-26T15:30:00.000Z'))).toEqual({ from: '2026-07-28T15:00:00.000Z', to: '2026-08-26T15:30:00.000Z', label: '최근 30일' });
  });
});
