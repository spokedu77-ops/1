import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');
const migration = read('supabase/migrations/20261026115102_stage2_session_writes_expand.sql');
const hotfix = read('supabase/migrations/20261027160642_stage2_p0_conflict_http_409.sql');
const contract = read('supabase/contract-migrations/20261026115108_stage2_session_writes_contract.sql');
const sessionsRoute = read('app/api/spokedu-master/sessions/route.ts');
const attendanceRoute = read('app/api/spokedu-master/sessions/[sessionId]/attendance/route.ts');
const attendanceHook = read('app/spokedu-master/manage/session-detail/useSessionAttendance.ts');
const captureMigration = read('supabase/migrations/20261025152845_harden_spokedu_master_session_capture_concurrency.sql');
const capturePanel = read('app/spokedu-master/activity/SessionCapturePanel.tsx');
const functionBlock = (sql: string, name: string) => {
  const start = sql.indexOf(`create or replace function public.${name}(`);
  const end = sql.indexOf('end $$;', start);
  return sql.slice(start, end + 'end $$;'.length).replace(/\r\n/g, '\n');
};

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
    expect(hotfix).toContain("errcode='PT409', message='session attendance version conflict'");
    expect(migration).toContain("item->'status'='null'::jsonb");
    expect(attendanceRoute).toContain("rpc('spokedu_master_update_session_attendance_v2'");
    expect(attendanceRoute).toContain("error.code === 'PT409'");
    expect(attendanceRoute).not.toContain("error.code === '40001'");
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
    expect(hotfix).toContain("errcode='PT409', message='session memo version conflict'");
    expect(hotfix).toContain("errcode='PT409', message='session write version conflict'");
    expect(sessionsRoute.match(/error\?\.code === 'PT409'/g)).toHaveLength(2);
    expect(sessionsRoute).not.toContain("error?.code === '40001'");
  });

  it('uses PT409 only for optimistic version conflicts in the forward migration', () => {
    expect(hotfix.match(/errcode='PT409'/g)).toHaveLength(5);
    expect(hotfix).not.toContain("errcode='40001'");
    expect(hotfix.match(/security definer set search_path=pg_catalog,public/g)).toHaveLength(4);
    for (const [source, name] of [
      [migration, 'spokedu_master_update_session_attendance_v2'],
      [migration, 'spokedu_master_save_session_v2'],
      [migration, 'spokedu_master_complete_session_v2'],
      [captureMigration, 'spokedu_master_save_session_capture_v2'],
    ] as const) {
      expect(functionBlock(hotfix, name).replaceAll("errcode='PT409'", "errcode='40001'"))
        .toBe(functionBlock(source, name));
    }
  });

  it('keeps local drafts intact when a conflict is reported', () => {
    expect(attendanceHook).toContain('replaceAttendance(next)');
    expect(attendanceHook).toMatch(/catch \(caught\)[\s\S]*setDirty\(true\)/);
    expect(capturePanel).toContain('if (caught instanceof SessionCaptureConflictError) setRemoteChange(true)');
    expect(capturePanel).toContain('현재 입력은 유지되며, 최신 기록을 확인한 뒤 다시 저장해 주세요.');
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
