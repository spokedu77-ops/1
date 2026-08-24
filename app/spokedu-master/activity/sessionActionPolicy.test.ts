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

  it('keeps cancelled sessions immutable', () => {
    expect(Object.values(getSessionActionPolicy('cancelled')).some(Boolean)).toBe(false);
  });
});
