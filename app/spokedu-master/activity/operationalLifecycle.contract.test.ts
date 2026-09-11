import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { readSessionDetailSource } from '../manage/session-detailTestSource';

const activity = readSessionDetailSource();
const provider = readFileSync('app/spokedu-master/operational/OperationalDataProvider.tsx', 'utf8');
const migration = readFileSync('supabase/migrations/20260824120000_spokedu_master_atomic_session_completion.sql', 'utf8');

describe('MASTER operational lifecycle integrity', () => {
  it('uses an atomic and response-lost-safe completion command', () => {
    expect(migration).toContain('spokedu_master_complete_session');
    expect(migration).toContain("if v_session.status = 'completed'");
    expect(migration).toContain('spokedu_master_replace_session_attendance');
    expect(migration).toContain("'completed', p_memo");
    expect(provider).toContain("method: 'PUT'");
    expect(activity).toContain('data.completeSession');
  });

  it('replaces reorder state with the server-authoritative activity list', () => {
    expect(provider).toContain('programs: json.data');
    expect(provider).not.toContain('item.programs.find((program) => program.id === id)!');
  });

  it('keeps cancelled content immutable and offers quiet restore and deletion', () => {
    expect(activity).toContain('취소 해제');
    expect(activity).toContain('수업 삭제');
    expect(activity).toContain("status === 'cancelled'");
  });

  it('allows cancelled to scheduled restore in the foundation migration chain', () => {
    const restore = readFileSync('supabase/migrations/20260826120000_spokedu_master_session_restore.sql', 'utf8');
    expect(restore).toContain("old.status='cancelled' and new.status='scheduled'");
    expect(restore).toContain("v_old.status='cancelled' and p_status='scheduled'");
  });

  it('reopens completed sessions without deleting their recorded contents', () => {
    const reopen = readFileSync('supabase/migrations/20260901155330_spokedu_master_session_reopen_and_parent_notice.sql', 'utf8');
    expect(reopen).toContain("v_old.status in ('cancelled','completed') and p_status='scheduled'");
    expect(reopen).toContain("new.completed_at := null");
    expect(reopen).not.toContain('delete from public.spokedu_master_session_programs');
    expect(activity).toContain('수업 완료 취소');
    expect(activity).toContain("void persist('scheduled')");
  });
});
