import { describe, expect, it } from 'vitest';
import { getSessionActionPolicy } from './sessionActionPolicy';

describe('Session action policy', () => {
  it('keeps activity completion locked until the Session starts', () => {
    expect(getSessionActionPolicy('scheduled', null)).toMatchObject({
      toggleActivityCompletion: false,
      addActivities: true,
      removeActivities: true,
      reorderActivities: true,
    });
  });

  it('locks structural schedule changes after start while preserving RUN actions', () => {
    expect(getSessionActionPolicy('scheduled', '2026-08-26T07:05:00.000Z')).toMatchObject({
      editSchedule: false,
      addActivities: false,
      removeActivities: false,
      reorderActivities: false,
      editAttendance: true,
      toggleActivityCompletion: true,
      complete: true,
    });
  });
  it('allows the three supported corrections after completion', () => {
    const policy = getSessionActionPolicy('completed');
    expect(policy).toMatchObject({
      editAttendance: true,
      markAllPresent: true,
      editMemo: true,
      toggleActivityCompletion: true,
      editSchedule: false,
      addActivities: false,
      removeActivities: false,
      reorderActivities: false,
      restore: true,
    });
  });

  it('keeps cancelled content immutable while allowing lifecycle recovery or deletion', () => {
    const policy = getSessionActionPolicy('cancelled');
    expect(policy.restore).toBe(true);
    expect(policy.deletePermanently).toBe(true);
    expect(policy.editSchedule).toBe(false);
    expect(policy.editAttendance).toBe(false);
  });
});
