import { describe, expect, it } from 'vitest';
import { getSessionActionPolicy } from './sessionActionPolicy';

describe('Session action policy', () => {
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
