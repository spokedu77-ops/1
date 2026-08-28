import { describe, expect, it } from 'vitest';
import type { MasterClassDto, MasterSessionDto } from '../types/operational';
import { MASTER_ACTION_COPY } from './masterActionGrammar';
import { buildMasterWorkQueue, deriveMasterSessionWorkState } from './masterSessionWorkState';
import {
  MASTER_HOME_WORK_QUEUE_HORIZON_DAYS,
  MASTER_SURFACE_ORDERING,
  buildClassPriorityWork,
  buildOperationalDebtQueue,
  deriveMasterTemporalMeaning,
  isOperationalDebt,
  summarizePastOperationalDebt,
} from './masterTemporalContract';
import { buildClassCards, buildClassAttendanceView, selectRecentCompletedClassSessions } from '../classes/classManagementModel';
import { buildTodaySessionCards } from '../dashboard/todaySessionsModel';

const classItem: MasterClassDto = { id: 'c1', name: 'A반', studentIds: ['s1'], createdAt: '', updatedAt: '' };
const makeSession = (input: Partial<MasterSessionDto> & { id: string }): MasterSessionDto => ({
  classId: 'c1',
  className: 'A반',
  startAt: '2026-08-26T07:00:00.000Z',
  startedAt: null,
  endAt: '2026-08-26T08:00:00.000Z',
  status: 'scheduled',
  memo: null,
  completedAt: null,
  programs: [],
  attendance: [],
  createdAt: '',
  updatedAt: '',
  ...input,
});
const programs = (done: number, total: number) => Array.from({ length: total }, (_, index) => ({
  id: `p${index}`,
  sourceType: 'program' as const,
  programId: index,
  spomovePresetId: null,
  programTitle: `활동 ${index}`,
  sortOrder: index,
  isCompleted: index < done,
}));

/** LONG-CLASS-01 — 12 completed + 2 upcoming + 1 overdue + 1 cancelled */
function longClassFixture(nowIso: string) {
  const now = new Date(nowIso);
  const completed = Array.from({ length: 12 }, (_, index) => makeSession({
    id: `done-${index}`,
    status: 'completed',
    startAt: new Date(now.getTime() - (index + 5) * 86400000).toISOString(),
    endAt: new Date(now.getTime() - (index + 5) * 86400000 + 3600000).toISOString(),
    programs: programs(2, 2),
    attendance: [{ id: `a-${index}`, studentId: 's1', studentName: '민수', status: 'present' }],
    completedAt: new Date(now.getTime() - (index + 5) * 86400000 + 3600000).toISOString(),
  }));
  const upcoming = [
    makeSession({ id: 'up-1', startAt: new Date(now.getTime() + 2 * 86400000).toISOString(), endAt: new Date(now.getTime() + 2 * 86400000 + 3600000).toISOString(), programs: programs(0, 2) }),
    makeSession({ id: 'up-2', startAt: new Date(now.getTime() + 9 * 86400000).toISOString(), endAt: new Date(now.getTime() + 9 * 86400000 + 3600000).toISOString(), programs: programs(0, 1) }),
  ];
  const overdue = makeSession({
    id: 'overdue-old',
    startAt: new Date(now.getTime() - 21 * 86400000).toISOString(),
    endAt: new Date(now.getTime() - 21 * 86400000 + 3600000).toISOString(),
    programs: programs(1, 3),
  });
  const cancelled = makeSession({
    id: 'cancelled-1',
    status: 'cancelled',
    startAt: new Date(now.getTime() - 10 * 86400000).toISOString(),
    endAt: new Date(now.getTime() - 10 * 86400000 + 3600000).toISOString(),
  });
  return { now, sessions: [...completed, ...upcoming, overdue, cancelled] };
}

describe('MASTER Longitudinal Retention — temporal / debt', () => {
  it('keeps surface ordering vocabulary distinct', () => {
    expect(MASTER_SURFACE_ORDERING).toEqual({
      home: 'today-first',
      class: 'unresolved-first',
      calendar: 'chronological',
    });
    expect(MASTER_HOME_WORK_QUEUE_HORIZON_DAYS).toBe(14);
  });

  it('DEBT-01: 21-day overdue remains discoverable outside Home queue horizon', () => {
    const { now, sessions } = longClassFixture('2026-08-26T07:30:00.000Z');
    const overdue = sessions.find((session) => session.id === 'overdue-old')!;
    const state = deriveMasterSessionWorkState(overdue, classItem, now);
    expect(deriveMasterTemporalMeaning(overdue, state)).toBe('DEBT');
    expect(isOperationalDebt(state)).toBe(true);
    expect(state.primaryLabel).toBe(MASTER_ACTION_COPY.reviewSessionStatus);

    const homeQueue = buildMasterWorkQueue({ sessions, classes: [classItem], now, overdueHorizonDays: MASTER_HOME_WORK_QUEUE_HORIZON_DAYS });
    expect(homeQueue.some((item) => item.session.id === 'overdue-old')).toBe(false);

    const debtQueue = buildOperationalDebtQueue({ sessions, classes: [classItem], now });
    expect(debtQueue.some((item) => item.session.id === 'overdue-old')).toBe(true);

    const classPriority = buildClassPriorityWork({ sessions, classItem, now });
    expect(classPriority?.session.id).toBe('overdue-old');

    const pastDebt = summarizePastOperationalDebt({ sessions, classes: [classItem], now });
    expect(pastDebt.count).toBeGreaterThanOrEqual(1);
    expect(pastDebt.leadSessionId).toBe('overdue-old');
  });

  it('LONG-CLASS-01: Class card surfaces debt without vanity-first metrics', () => {
    const { now, sessions } = longClassFixture('2026-08-26T07:30:00.000Z');
    const card = buildClassCards([classItem], sessions, now)[0]!;
    expect(card.completedSessionCount).toBe(12);
    expect(card.operationalDebtCount).toBeGreaterThanOrEqual(1);
    expect(card.prioritySession?.id).toBe('overdue-old');
    expect(card.nextSession?.id).toBe('up-1');
    expect(selectRecentCompletedClassSessions(sessions, 'c1', 3)).toHaveLength(3);
  });

  it('Home today-first excludes past debt from today cards but continuity count sees it', () => {
    const { now, sessions } = longClassFixture('2026-08-26T07:30:00.000Z');
    const todayCards = buildTodaySessionCards(sessions, [classItem], '2026-08-26', now);
    expect(todayCards.every((card) => card.session.id !== 'overdue-old')).toBe(true);
    expect(summarizePastOperationalDebt({ sessions, classes: [classItem], now }).count).toBeGreaterThan(0);
  });

  it('Home follow-up excludes unresolved Sessions on the current Seoul day', () => {
    const now = new Date('2026-08-26T07:30:00.000Z');
    const todayOverdue = makeSession({ id: 'today-overdue', startAt: '2026-08-26T05:00:00.000Z', endAt: '2026-08-26T06:00:00.000Z', programs: programs(0, 1) });
    expect(summarizePastOperationalDebt({ sessions: [todayOverdue], classes: [classItem], now })).toEqual({
      count: 0,
      leadSessionId: null,
      leadClassId: null,
    });
  });
});

describe('MASTER Longitudinal Retention — roster drift / history', () => {
  it('ROSTER-DRIFT-01: removed student stays in completed attendance projection', () => {
    const classWithRoster: MasterClassDto = { ...classItem, studentIds: ['s-current'] };
    const students = [
      { id: 's-current', legacyId: null, name: '현재', meta: '', createdAt: '', updatedAt: '' },
    ];
    const session = makeSession({
      id: 'hist',
      status: 'completed',
      startAt: '2026-01-15T01:00:00.000Z',
      endAt: '2026-01-15T02:00:00.000Z',
      attendance: [
        { id: 'a1', studentId: 's-current', studentName: '현재 이전', status: 'present' },
        { id: 'a2', studentId: 's-removed', studentName: '김민수', status: 'present' },
      ],
    });
    const view = buildClassAttendanceView(classWithRoster, [session], students, '2026-01');
    expect(view.rows.map((row) => row.studentId).sort()).toEqual(['s-current', 's-removed'].sort());
    expect(view.rows.find((row) => row.studentId === 's-removed')).toMatchObject({
      studentName: '김민수',
      current: false,
      attendanceBySessionId: { hist: 'present' },
    });
  });

  it('HISTORY-REUSE-01: completed without attendance gap is HISTORY not DEBT', () => {
    const session = makeSession({
      id: 'done',
      status: 'completed',
      startAt: '2026-08-10T07:00:00.000Z',
      endAt: '2026-08-10T08:00:00.000Z',
      programs: programs(2, 2),
      attendance: [{ id: 'a', studentId: 's1', studentName: '민수', status: 'present' }],
    });
    const state = deriveMasterSessionWorkState(session, classItem, new Date('2026-08-26T07:30:00.000Z'));
    expect(deriveMasterTemporalMeaning(session, state)).toBe('HISTORY');
    expect(isOperationalDebt(state)).toBe(false);
    expect(state.primaryLabel).toBe(MASTER_ACTION_COPY.viewSession);
  });
});

describe('MASTER Longitudinal Retention — WorkState fixture matrix', () => {
  const now = new Date('2026-08-26T07:30:00.000Z');
  it.each([
    ['future needs-prep', makeSession({ id: 'f0', startAt: '2026-08-28T07:00:00.000Z', endAt: '2026-08-28T08:00:00.000Z', programs: [] }), 'needs-preparation', 'NEXT'],
    ['future ready', makeSession({ id: 'f1', startAt: '2026-08-28T07:00:00.000Z', endAt: '2026-08-28T08:00:00.000Z', programs: programs(0, 2) }), 'ready', 'NEXT'],
    ['today partial', makeSession({ id: 't1', programs: programs(1, 3) }), 'in-progress', 'NOW'],
    ['today wrap', makeSession({ id: 't2', programs: programs(3, 3) }), 'ready-to-wrap', 'NOW'],
    ['past scheduled', makeSession({ id: 'o1', startAt: '2026-08-20T07:00:00.000Z', endAt: '2026-08-20T08:00:00.000Z', programs: programs(0, 1) }), 'ready', 'DEBT'],
    ['completed attendance', makeSession({ id: 'c1', status: 'completed', startAt: '2026-08-10T07:00:00.000Z', endAt: '2026-08-10T08:00:00.000Z', programs: programs(2, 2), attendance: [{ id: 'a', studentId: 's1', studentName: '민수', status: 'present' }] }), 'completed', 'HISTORY'],
    ['completed no attendance', makeSession({ id: 'c2', status: 'completed', startAt: '2026-08-10T07:00:00.000Z', endAt: '2026-08-10T08:00:00.000Z', programs: programs(2, 2) }), 'completed', 'DEBT'],
    ['cancelled', makeSession({ id: 'x1', status: 'cancelled', endAt: '2026-08-20T00:00:00.000Z' }), 'cancelled', 'CANCELLED'],
  ] as const)('%s', (_label, session, stage, meaning) => {
    const state = deriveMasterSessionWorkState(session, classItem, now);
    expect(state.stage).toBe(stage);
    expect(deriveMasterTemporalMeaning(session, state)).toBe(meaning);
  });
});
