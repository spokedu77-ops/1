import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const activity = readFileSync('app/spokedu-master/activity/page.tsx', 'utf8');
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

  it('keeps cancelled content immutable and offers recovery, replacement, and deletion', () => {
    expect(activity).toContain('취소 기록은 보존됩니다. 상황에 맞는 다음 행동을 선택해 주세요.');
    expect(activity).toContain('MASTER_ACTION_COPY.restoreSession');
    expect(activity).toContain('MASTER_ACTION_COPY.replaceSession');
    expect(activity).toContain('MASTER_ACTION_COPY.deleteSession');
    expect(activity).toContain('create=1&class=');
    expect(activity).toContain('Keep the sheet open so complete / restore / cancel recovery stay in one continuous flow.');
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
    expect(activity).toContain('출석, 활동 완료 표시, 수업 메모와 안내문은 삭제하지 않습니다.');
  });
});
