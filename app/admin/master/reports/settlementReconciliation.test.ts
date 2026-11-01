import { describe, expect, it, vi } from 'vitest';
import {
  buildSettlementExcludedIdSet, getExtraTeachersFromSession, readAllSettlementRows,
  sessionPayableFees, settlementIssues, settlementPeriodBounds, settlementRecipients, teacherSessionFee,
  type SessionRow, type TeacherRow,
} from './settlementReconciliation';
import { buildMemoWithExtras } from '@/app/admin/classes-shared/lib/sessionUtils';

const ids = [1, 2, 3].map(n => `70000000-0000-4000-8000-${String(n).padStart(12, '0')}`);
const users: TeacherRow[] = [
  { id: ids[0], name: '김구민', role: 'admin', is_active: true },
  { id: ids[1], name: '과거 강사', role: 'teacher', is_active: false },
  { id: ids[2], name: '활성 강사', role: 'teacher', is_active: true },
];
const session: SessionRow = { id: 'session', title: '북서울', created_by: ids[0], price: 0, status: 'finished',
  memo: `EXTRA_TEACHERS:${JSON.stringify([{ id: ids[1], price: 25000 }])}\nPOSTPONE_SNAPSHOT:[{"oldMemo":"EXTRA_TEACHERS:[]"}]`,
  start_at: '2026-10-21T06:30:00Z', end_at: '2026-10-21T07:30:00Z' };

describe('settlement reconciles historical recipients and metadata', () => {
  it('an explicit assistant removal cannot revive an older students_text assignment', () => {
    const cleared = { ...session, memo: 'EXTRA_TEACHERS:[]', students_text: session.memo };
    expect(getExtraTeachersFromSession(cleared)).toEqual([]);
    expect(sessionPayableFees(cleared, buildSettlementExcludedIdSet(users))).toBe(0);
    expect(getExtraTeachersFromSession({ ...session, memo: null, students_text: session.memo })).toHaveLength(1);
  });
  it('keeps a non-active historical assistant and makes headline and recipient gross match', () => {
    const excluded = buildSettlementExcludedIdSet(users);
    const recipients = settlementRecipients(users, [session], [], excluded);
    expect(recipients.map(t => t.id)).toEqual([ids[1], ids[2]]);
    expect(recipients.reduce((sum, t) => sum + teacherSessionFee(session, t.id, excluded), 0)).toBe(sessionPayableFees(session, excluded));
    expect(sessionPayableFees(session, excluded)).toBe(25000);
  });
  it('includes an adjustment-only historical recipient with a changed role', () => {
    const changed = users.map(u => u.id === ids[1] ? { ...u, role: 'former' } : u);
    expect(settlementRecipients(changed, [], [{ id: 'adj', teacher_id: ids[1], amount: 1000 }], new Set()).map(t => t.id)).toContain(ids[1]);
  });
  it('does not silently discard missing identities or omit their money', () => {
    expect(settlementRecipients([], [session], [], new Set()).map(t => t.id)).toEqual([ids[0], ids[1]]);
  });
  it('parses assistants even with appended snapshots and preserves legacy fallback', () => {
    expect(getExtraTeachersFromSession(session)).toEqual([{ id: ids[1], price: 25000 }]);
    expect(getExtraTeachersFromSession({ ...session, memo: '', students_text: session.memo })).toHaveLength(1);
  });
  it.each(['EXTRA_TEACHERS:[{"id":"","price":0}]', 'EXTRA_TEACHERS:bad'])('does not silently treat malformed assignments as no pay: %s', memo => {
    expect(() => getExtraTeachersFromSession({ ...session, memo })).toThrow();
    expect(settlementIssues(users, [{ ...session, memo, status: 'opened' }], Date.now())[0].reason).toContain('배정 오류');
  });
  it('shows elapsed unpaid assignments without changing their completion state', () => {
    const opened = { ...session, status: 'opened' };
    const issues = settlementIssues(users, [opened], Date.parse('2026-11-01T00:00:00Z'));
    expect(issues[0]).toMatchObject({ amount: 25000 });
    expect(issues[0].reason).toContain('정산 제외'); expect(issues[0].reason).toContain('비활성');
    expect(opened.status).toBe('opened');
  });
  it('does not flag postponed or cancelled sessions as unpaid attendance', () => {
    expect(settlementIssues(users, ['postponed', 'cancelled'].map(status => ({ ...session, status })), Date.now())).toEqual([]);
  });
  it('rejects empty assistant IDs at the creation serializer', () => {
    expect(() => buildMemoWithExtras('', [{ id: '', price: 0 }])).toThrow();
    expect(buildMemoWithExtras('', [{ id: ids[1], price: 0 }])).toContain('"price":0');
  });
  it('uses inclusive Korean midnight and exclusive next midnight across month/year boundaries', () => {
    expect(settlementPeriodBounds(2026, 10, 16, 31)).toEqual({ start: '2026-10-16T00:00:00+09:00', end: '2026-10-31T15:00:00.000Z' });
    expect(settlementPeriodBounds(2026, 12, 16, 31).end).toBe('2026-12-31T15:00:00.000Z');
  });
  it('fetches all pages and surfaces errors after a successful first page', async () => {
    const read = vi.fn().mockResolvedValueOnce({ data: Array(500).fill({ id: 'first' }), error: null })
      .mockResolvedValueOnce({ data: [{ id: 'last' }], error: null });
    expect(await readAllSettlementRows(read)).toHaveLength(501);
    expect(read).toHaveBeenLastCalledWith(500, 999);
    const failed = vi.fn().mockResolvedValueOnce({ data: Array(500).fill({}), error: null })
      .mockResolvedValueOnce({ data: null, error: { message: 'offline' } });
    await expect(readAllSettlementRows(failed)).rejects.toThrow('offline');
  });
});
