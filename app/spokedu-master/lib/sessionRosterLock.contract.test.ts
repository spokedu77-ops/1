import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { readSessionDetailSource } from '../manage/session-detailTestSource';

const read = (path: string) => readFileSync(path, 'utf8');
const migration = read('supabase/migrations/20260914011000_spokedu_master_session_roster_lock.sql');
const sessionsRoute = read('app/api/spokedu-master/sessions/route.ts');
const attendanceRoute = read('app/api/spokedu-master/sessions/[sessionId]/attendance/route.ts');
const nextRoute = read('app/api/spokedu-master/sessions/[sessionId]/next/route.ts');
const sheet = readSessionDetailSource();

describe('SPOKEDU MASTER session roster lock', () => {
  it('adds roster_locked_at without a participant table or backfill', () => {
    expect(migration).toContain('add column if not exists roster_locked_at timestamptz null');
    expect(migration).toContain('drop table if exists public.spokedu_master_session_participants cascade');
    expect(migration).not.toMatch(/create table if not exists public\.spokedu_master_session_participants/);
    expect(migration).not.toMatch(/create or replace function public\.spokedu_master_ensure_session_participants/);
    expect(migration).not.toMatch(/create trigger[\s\S]*class_students_sync_session_participants/);
    expect(migration).not.toContain("update public.spokedu_master_sessions set roster_locked_at");
    expect(migration).not.toContain('raise notice');
  });

  it('locks the roster only when a scheduled session is completed', () => {
    expect(migration).toContain("if old.status='scheduled' and new.status='completed' and new.roster_locked_at is null then");
    expect(migration).toContain('new.roster_locked_at := now()');
    expect(migration).toContain('locked roster cannot add or remove students');
    expect(migration).toContain('complete attendance must include current class roster');
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
  });
});
