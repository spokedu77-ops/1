import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = readFileSync('supabase/migrations/20261025152845_harden_spokedu_master_session_capture_concurrency.sql', 'utf8');
const hotfix = readFileSync('supabase/migrations/20261027160642_stage2_p0_conflict_http_409.sql', 'utf8');
const route = readFileSync('app/api/spokedu-master/session-captures/route.ts', 'utf8');

describe('Session Capture concurrency hardening', () => {
  it('keeps the legacy RPC and adds a versioned additive RPC', () => {
    expect(migration).toContain('add column if not exists capture_version');
    expect(migration).toContain('spokedu_master_save_session_capture_v2');
    expect(migration).not.toContain('drop function');
  });

  it('locks the aggregate and rejects stale writers', () => {
    expect(migration).toMatch(/spokedu_master_sessions[\s\S]*for update/);
    expect(migration).toMatch(/spokedu_master_class_records[\s\S]*for update/);
    expect(migration).toContain("errcode='40001'");
    expect(hotfix.match(/errcode='PT409', message='session capture version conflict'/g)).toHaveLength(2);
    expect(route).toContain("error.code === 'PT409' ? 409");
    expect(route).not.toContain("error.code === '40001' ? 409");
  });

  it('patches only changed observations and preserves historical snapshots', () => {
    expect(migration).toContain('p_observation_changes');
    expect(migration).toContain('on conflict (record_id,student_id)');
    expect(migration).not.toMatch(/delete from public\.spokedu_master_class_record_students\s+where record_id = v_record/i);
    expect(migration).not.toContain('student_name_snapshot=excluded.student_name_snapshot');
    expect(migration).not.toContain('attendance=excluded.attendance');
  });

  it('keeps the RPC service-only', () => {
    expect(migration).toContain('revoke all on function public.spokedu_master_save_session_capture_v2');
    expect(migration).toContain('grant execute on function public.spokedu_master_save_session_capture_v2');
    expect(migration).toContain('to service_role');
  });
});
