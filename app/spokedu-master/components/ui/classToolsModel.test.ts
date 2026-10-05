import { describe, expect, it } from 'vitest';
import { absentStudentIdsForClassTools, COUNTDOWN_TIMER_MODE_CONFIG, distributeEvenly, formatCountdownOption, resolveClassToolParticipants, traceLadderDestination } from './classToolsModel';

describe('class tools foundation contracts', () => {
  it('creates two to four randomly ordered teams with at most one member difference', () => {
    const teams = distributeEvenly([1, 2, 3, 4, 5, 6, 7], 3, () => 0.5);
    expect(teams).toHaveLength(3);
    expect(teams.flat().toSorted()).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(Math.max(...teams.map((team) => team.length)) - Math.min(...teams.map((team) => team.length))).toBeLessThanOrEqual(1);
  });

  it('traces one ladder participant independently', () => {
    expect(traceLadderDestination(0, 3, [{ level: 0, left: 0 }, { level: 2, left: 1 }])).toBe(2);
    expect(traceLadderDestination(2, 3, [{ level: 0, left: 0 }, { level: 2, left: 1 }])).toBe(1);
  });

  it('uses only explicitly present students for Session-linked roster tools', () => {
    const roster = [{ id: 'present' }, { id: 'absent' }, { id: 'unrecorded' }];
    const attendance = [
      { studentId: 'present', status: 'present' as const },
      { studentId: 'absent', status: 'absent' as const },
    ];

    expect(resolveClassToolParticipants(roster, attendance)).toEqual([{ id: 'present' }]);
    expect(resolveClassToolParticipants(roster)).toEqual(roster);
  });

  it('drops the absence just saved in class management, then today if that session is for another class', () => {
    const sessions = [
      {
        id: 'oct-1',
        classId: 'class-a',
        status: 'scheduled',
        startAt: '2026-10-01T00:55:00.000Z',
        endAt: '2026-10-01T02:25:00.000Z',
        attendance: [{ studentId: 'mina', status: 'absent' as const }],
      },
      {
        id: 'today',
        classId: 'class-b',
        status: 'scheduled',
        startAt: '2026-10-05T01:00:00.000Z',
        endAt: '2026-10-05T02:00:00.000Z',
        attendance: [{ studentId: 'jun', status: 'absent' as const }],
      },
    ];
    const now = new Date('2026-10-05T01:30:00.000Z');
    expect(absentStudentIdsForClassTools(sessions, 'class-a', 'oct-1', now)).toEqual(['mina']);
    expect(absentStudentIdsForClassTools(sessions, 'class-b', 'oct-1', now)).toEqual(['jun']);
  });

  it('separates activity counting from rest countdown copy', () => {
    expect(COUNTDOWN_TIMER_MODE_CONFIG.activity.supportsCount).toBe(true);
    expect(COUNTDOWN_TIMER_MODE_CONFIG.rest.supportsCount).toBe(false);
    expect(COUNTDOWN_TIMER_MODE_CONFIG.rest.expiredLabel).toBe('휴식 시간이 끝났습니다.');
    expect(COUNTDOWN_TIMER_MODE_CONFIG.activity.options.map(formatCountdownOption)).toEqual(['30초', '1분', '2분', '3분', '5분']);
  });
});
