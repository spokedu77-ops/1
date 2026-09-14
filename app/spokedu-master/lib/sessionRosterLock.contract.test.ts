import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { getSessionActionPolicy } from '../activity/sessionActionPolicy';
import { readSessionDetailSource } from '../manage/session-detailTestSource';

const read = (path: string) => readFileSync(path, 'utf8');
const lockMigration = read('supabase/migrations/20260914011000_spokedu_master_session_roster_lock.sql');
const wiringMigration = read('supabase/migrations/20260914020000_spokedu_master_session_roster_lock_wiring.sql');
const editPolicyTrigger = read('supabase/migrations/20260822210000_spokedu_master_session_foundation_hardening.sql');
const sessionsRoute = read('app/api/spokedu-master/sessions/route.ts');
const attendanceRoute = read('app/api/spokedu-master/sessions/[sessionId]/attendance/route.ts');
const nextRoute = read('app/api/spokedu-master/sessions/[sessionId]/next/route.ts');
const capture = read('app/spokedu-master/activity/SessionCapturePanel.tsx');
const policy = read('app/spokedu-master/activity/sessionActionPolicy.ts');
const sheet = readSessionDetailSource();

describe('SPOKEDU MASTER session roster lock', () => {
  it('adds roster_locked_at without a participant table or backfill', () => {
    expect(lockMigration).toContain('add column if not exists roster_locked_at timestamptz null');
    expect(lockMigration).toContain('drop table if exists public.spokedu_master_session_participants cascade');
    expect(lockMigration).not.toMatch(/create table if not exists public\.spokedu_master_session_participants/);
    expect(lockMigration).not.toMatch(/create or replace function public\.spokedu_master_ensure_session_participants/);
    expect(lockMigration).not.toMatch(/create trigger[\s\S]*class_students_sync_session_participants/);
    expect(lockMigration).not.toContain("update public.spokedu_master_sessions set roster_locked_at");
    expect(lockMigration).not.toContain('raise notice');
    expect(wiringMigration).not.toMatch(/create table[\s\S]*spokedu_master_session_participants/);
    expect(wiringMigration).not.toContain("update public.spokedu_master_sessions set roster_locked_at");
    expect(wiringMigration).not.toContain('raise notice');
  });

  it('documents existing edit-policy trigger wiring and adds a lock trigger only when missing', () => {
    expect(editPolicyTrigger).toContain('create trigger spokedu_master_sessions_edit_policy before update on public.spokedu_master_sessions');
    expect(editPolicyTrigger).toContain('execute function public.spokedu_master_guard_session_edit_policy()');
    expect(wiringMigration).toContain('spokedu_master_guard_session_edit_policy');
    expect(wiringMigration).toContain('spokedu_master_guard_session_roster_lock');
    expect(wiringMigration).toContain('if not v_has_lock_trigger then');
    expect(wiringMigration).toContain('create trigger spokedu_master_sessions_roster_lock');
    expect(wiringMigration).toContain('old.roster_locked_at is null');
    expect(wiringMigration).toContain('new.roster_locked_at := coalesce(new.roster_locked_at, now())');
  });

  it('locks the roster only when a scheduled session is completed', () => {
    expect(lockMigration).toContain("if old.status='scheduled' and new.status='completed' and new.roster_locked_at is null then");
    expect(lockMigration).toContain('new.roster_locked_at := now()');
    expect(lockMigration).toContain('locked roster cannot add or remove students');
    expect(lockMigration).toContain('complete attendance must include current class roster');
  });

  it('uses attendance as the locked roster in API and UI', () => {
    expect(sessionsRoute).toContain('roster_locked_at');
    expect(sessionsRoute).toContain('rosterLockedAt: row.roster_locked_at');
    expect(sessionsRoute).toContain('buildSessionCompletionRosterStudentIds');
    expect(sessionsRoute).not.toContain('spokedu_master_session_participants');
    expect(nextRoute).toContain('roster_locked_at');
    expect(nextRoute).not.toContain('spokedu_master_session_participants');
    expect(attendanceRoute).toContain('LOCKED_ROSTER_MESSAGE');
    expect(attendanceRoute).toContain('lockedRosterStudentIdsEqual');
    expect(sheet).toContain('resolveSessionAttendanceRoster(activeSession ?? session, selectedClass, students)');
    expect(sheet).toContain('isSessionRosterLocked');
    expect(sheet).toContain('sessionRoster={attendance.roster}');
    expect(capture).toContain('sessionRoster: Array<{ id: string; name: string }>');
    expect(capture).not.toContain('classStudentIds');
  });

  it('removes completed restore in UI, policy, API, and DB while keeping cancelled restore', () => {
    expect(getSessionActionPolicy('completed').restore).toBe(false);
    expect(getSessionActionPolicy('cancelled').restore).toBe(true);
    expect(policy).toMatch(/completed:[\s\S]*restore: false/);
    expect(sheet).not.toContain('수업 완료 취소');
    expect(sessionsRoute).toContain("currentSession?.status === 'completed' && input.status === 'scheduled'");
    expect(sessionsRoute).toContain('COMPLETED_RESTORE_FORBIDDEN_MESSAGE');
    expect(wiringMigration).toContain("if old.status='completed' and new.status='scheduled' then");
    expect(wiringMigration).toContain("if v_old.status='completed' and p_status='scheduled' then");
    expect(wiringMigration).toContain("or (old.status='cancelled' and new.status='scheduled')");
    expect(wiringMigration).toContain("or (v_old.status='cancelled' and p_status='scheduled')");
  });
});
