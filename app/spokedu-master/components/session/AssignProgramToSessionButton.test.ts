import { describe, expect, it } from 'vitest';
import type { MasterSessionDto } from '../../types/operational';
import { getProgramAssignmentAvailability } from './AssignProgramToSessionButton';

function session(overrides: Partial<MasterSessionDto> = {}): MasterSessionDto {
  return {
    id: 'session-1',
    classId: 'class-1',
    className: '테스트 수업',
    startAt: '2026-10-14T09:00:00+09:00',
    startedAt: null,
    endAt: '2026-10-14T10:00:00+09:00',
    status: 'scheduled',
    memo: null,
    completedAt: null,
    programs: [],
    attendance: [],
    createdAt: '2026-10-01T00:00:00Z',
    updatedAt: '2026-10-01T00:00:00Z',
    ...overrides,
  };
}

describe('AssignProgramToSessionButton availability', () => {
  it('allows only a scheduled Session that has not started', () => {
    expect(getProgramAssignmentAvailability(session(), 52)).toEqual({
      allowed: true,
      alreadyAssigned: false,
      reason: null,
    });
    expect(getProgramAssignmentAvailability(session({ startedAt: '2026-10-14T09:01:00+09:00' }), 52)).toMatchObject({
      allowed: false,
      reason: '이미 시작한 수업에는 추가할 수 없습니다.',
    });
  });

  it.each([
    ['completed', '완료된 수업에는 추가할 수 없습니다.'],
    ['cancelled', '취소된 수업에는 추가할 수 없습니다.'],
  ] as const)('blocks a %s Session', (status, reason) => {
    expect(getProgramAssignmentAvailability(session({ status }), 52)).toMatchObject({
      allowed: false,
      alreadyAssigned: false,
      reason,
    });
  });

  it('blocks a duplicate program before a request', () => {
    expect(getProgramAssignmentAvailability(session({
      programs: [{
        id: 'activity-1',
        sourceType: 'program',
        programId: 52,
        spomovePresetId: null,
        programTitle: '테스트 프로그램',
        sortOrder: 0,
        isCompleted: false,
      }],
    }), 52)).toEqual({
      allowed: false,
      alreadyAssigned: true,
      reason: '이미 추가된 활동입니다.',
    });
  });
});
