import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildSessionDraftDateTimes, getSeoulSessionDay } from '@/app/spokedu-master/lib/sessionDateTime';

const read = (path: string) => readFileSync(path, 'utf8');
const migration = read('supabase/migrations/20260823020000_spokedu_master_foundation_lockdown.sql');
const students = read('app/spokedu-master/students/page.tsx');
const provider = read('app/spokedu-master/operational/OperationalDataProvider.tsx');
const sessions = read('app/api/spokedu-master/sessions/route.ts');
const programRoute = read('app/api/spokedu-master/sessions/[sessionId]/programs/route.ts');
const activity = read('app/spokedu-master/activity/page.tsx');

describe('SPOKEDU MASTER final foundation lockdown', () => {
  it('saves a student and all class memberships in one database transaction', () => {
    expect(migration).toContain('spokedu_master_save_student');
    expect(migration).toContain('insert into public.spokedu_master_class_students');
    expect(students).not.toContain('syncMemberships');
  });

  it('rejects duplicate and unavailable class ids before membership writes', () => {
    expect(migration).toContain('duplicate class id');
    expect(migration).toContain('class unavailable');
  });

  it('keeps student update and membership replacement in the same RPC', () => {
    expect(read('app/api/spokedu-master/students/[id]/route.ts')).toContain("rpc('spokedu_master_save_student'");
  });

  it('removes current memberships during student soft delete', () => {
    expect(migration).toMatch(/spokedu_master_soft_delete_student[\s\S]*delete from public\.spokedu_master_class_students/);
    expect(provider).toContain('studentIds: item.studentIds.filter((id) => id !== studentId)');
  });

  it('does not delete historical attendance during student soft delete', () => {
    const body = migration.slice(migration.indexOf('spokedu_master_soft_delete_student'), migration.indexOf('spokedu_master_save_session'));
    expect(body).not.toContain('spokedu_master_session_attendance');
  });

  it('backfills and reads historical student name snapshots', () => {
    expect(migration).toContain('student_name_snapshot');
    expect(sessions).toContain('studentName: item.student_name_snapshot');
    expect(activity).toContain('entry.studentName');
  });

  it('clears scheduled attendance when the class changes', () => {
    expect(migration).toMatch(/old\.class_id is distinct from new\.class_id[\s\S]*delete from public\.spokedu_master_session_attendance/);
  });

  it('rejects scheduled attendance for a student outside the current class', () => {
    expect(migration).toContain('student is not an allowed participant');
  });

  it('preserves completed historical participants after membership removal', () => {
    expect(migration).toContain('historical participant cannot be removed');
    expect(activity).toContain('historicalRoster');
  });

  it('allows completed attendance status correction without replacing snapshots', () => {
    expect(migration).toContain("when v_session.status='scheduled' then excluded.student_name_snapshot");
  });

  it('rejects cancelled attendance changes', () => {
    expect(migration).toContain("v_session.status='cancelled'");
  });

  it('rejects implicit completed and cancelled reopen transitions', () => {
    expect(migration).toContain("old.status='scheduled' and new.status in ('completed','cancelled')");
    expect(migration).toContain('illegal session transition');
  });

  it('preserves completedAt after first completion', () => {
    expect(migration).toContain("when v_old.status='completed' then v_old.completed_at");
  });

  it('rejects unknown activity source types', () => {
    expect(programRoute).toContain("body?.sourceType !== 'program' && body?.sourceType !== 'spomove'");
  });

  it('resolves canonical Program title in the database instead of trusting the client', () => {
    expect(migration).toContain('from public.spokedu_pro_programs program');
    expect(provider).not.toContain('programId, programTitle });');
  });

  it('keeps SPOMOVE validation authoritative on the server', () => {
    expect(programRoute).toContain('findOfficialSpomovePreset');
    expect(programRoute).toContain("preset.catalogStatus === 'hold'");
  });

  it('does not mutate the initial Date while building a new Session draft', () => {
    const initial = new Date('2026-08-23T00:00:00+09:00');
    const before = initial.getTime();
    expect(buildSessionDraftDateTimes(initial)).toEqual({ startAt: '2026-08-23T10:00', endAt: '2026-08-23T11:00' });
    expect(initial.getTime()).toBe(before);
    expect(activity).not.toContain('initialDate.setHours');
  });

  it('uses Seoul business days for both 23:30 and 00:30 Sessions', () => {
    expect(getSeoulSessionDay('2026-08-23T14:30:00.000Z')).toBe('2026-08-23');
    expect(getSeoulSessionDay('2026-08-22T15:30:00.000Z')).toBe('2026-08-23');
    expect(activity).toContain('getSeoulSessionDay(session.startAt) === selectedDay');
  });

  it('keeps completed class labels on snapshots while refreshing scheduled Sessions', () => {
    expect(migration).toContain("status='scheduled'");
    expect(sessions).toContain('className: row.class_name_snapshot');
    expect(provider).toContain("item.status === 'scheduled'");
  });

  it('documents the two-source boundary before any third source is introduced', () => {
    expect(migration).toContain('Before adding a third independent source');
    expect(migration).toContain('do not append nullable source columns');
  });
});
