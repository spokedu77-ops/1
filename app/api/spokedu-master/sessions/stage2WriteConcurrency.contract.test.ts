import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');
const migration = read('supabase/migrations/20261026115102_stage2_session_writes_expand.sql');
const contract = read('supabase/contract-migrations/20261026115108_stage2_session_writes_contract.sql');
const sessionsRoute = read('app/api/spokedu-master/sessions/route.ts');
const attendanceRoute = read('app/api/spokedu-master/sessions/[sessionId]/attendance/route.ts');
const attendanceHook = read('app/spokedu-master/manage/session-detail/useSessionAttendance.ts');

describe('Stage 2 P0 versioned Session writes', () => {
  it('adds independent memo and attendance versions without rewriting existing rows', () => {
    expect(migration).toContain('add column if not exists memo_version bigint not null default 1');
    expect(migration).toContain('add column if not exists attendance_version bigint not null default 1');
  });

  it('locks the Session and rejects stale attendance before applying partial changes', () => {
    expect(migration).toContain('spokedu_master_update_session_attendance_v2');
    expect(migration).toContain('for update');
    expect(migration).toContain('p_expected_version <> v_session.attendance_version');
    expect(migration).toContain("errcode='40001'");
    expect(migration).toContain("item->'status'='null'::jsonb");
    expect(attendanceRoute).toContain("rpc('spokedu_master_update_session_attendance_v2'");
    expect(attendanceRoute).toContain("error.code === '40001'");
    expect(attendanceRoute).toContain('{ status: 409 }');
  });

  it('sends only changed student rows and serializes local saves', () => {
    expect(attendanceHook).toContain('previous[studentId] !== next[studentId]');
    expect(attendanceHook).toContain('saveQueueRef.current = saveQueueRef.current.then');
    expect(attendanceHook).toContain('attendanceVersionRef.current = await saveAttendance');
  });

  it('guards memo and completion writes with versions in the same database transaction', () => {
    expect(migration).toContain('spokedu_master_save_session_v2');
    expect(migration).toContain('p_expected_memo_version <> v_session.memo_version');
    expect(migration).toContain('spokedu_master_complete_session_v2');
    expect(migration).toContain('p_expected_attendance_version <> v_session.attendance_version');
    expect(sessionsRoute).toContain("rpc('spokedu_master_save_session_v2'");
    expect(sessionsRoute).toContain("rpc('spokedu_master_complete_session_v2'");
  });

  it('keeps legacy callers during expand and isolates every revocation in contract', () => {
    expect(migration).not.toContain('revoke execute on function public.spokedu_master_replace_session_attendance');
    expect(contract).toContain('revoke all on function public.spokedu_master_replace_session_attendance');
    expect(contract).toContain('revoke all on function public.spokedu_master_save_session');
    expect(contract).toContain('revoke all on function public.spokedu_master_complete_session');
    expect(contract).toContain('revoke all on function public.spokedu_master_save_session_capture');
  });

  it('installs a database-wide cutover gate with transaction drain locking', () => {
    expect(migration).toContain('spokedu_master_stage2_write_gate');
    expect(migration).toContain('pg_advisory_xact_lock_shared(742021,2)');
    expect(migration).toContain("errcode='55P03'");
    for (const table of ['spokedu_master_sessions', 'spokedu_master_session_attendance', 'spokedu_master_session_programs', 'spokedu_master_class_records', 'spokedu_master_class_record_students']) {
      expect(migration).toContain(`on public.${table}`);
    }
  });
});
