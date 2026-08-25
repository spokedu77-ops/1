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
    expect(activity).toContain('취소 해제');
    expect(activity).toContain('대체 수업 만들기');
    expect(activity).toContain('영구 삭제');
    expect(activity).toContain('create=1&class=');
  });
});
