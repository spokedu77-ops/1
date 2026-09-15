import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { readSessionDetailSource } from '../manage/session-detailTestSource';

const read = (path: string) => readFileSync(path, 'utf8');
const migration = read('supabase/migrations/20260915090000_spokedu_master_fresh_next_session.sql');
const route = read('app/api/spokedu-master/sessions/[sessionId]/next/route.ts');
const manage = read('app/spokedu-master/manage/ManageView.tsx');
const detail = readSessionDetailSource();

describe('fresh next Session contract', () => {
  it('copies the completed source roster as pending in one transaction', () => {
    expect(migration).toContain('spokedu_master_create_next_session_fresh');
    expect(migration).toContain("status='completed'");
    expect(migration).toContain("'scheduled',null,null,null,now()");
    expect(migration).toContain("student_id,student_name_snapshot,'pending'");
    expect(migration).toContain('spokedu_master_assert_no_class_time_collision');
    expect(migration).toContain('locked roster class cannot be changed');
    expect(migration).not.toContain('insert into public.spokedu_master_session_programs');
  });

  it('uses the fresh path without exposing legacy copy options', () => {
    expect(route).toContain("rpc('spokedu_master_create_next_session_fresh'");
    expect(detail).toContain('다음 수업도 예정되어 있나요?');
    expect(detail).toContain('다음 수업 만들기 →');
    expect(detail).toContain('활동과 메모는 새로 시작합니다.');
    expect(detail).not.toContain('copyPrograms');
    expect(detail).not.toContain('sourceSessionProgramIds');
  });

  it('opens the created Session and defaults to source time plus seven days', () => {
    expect(detail).toContain('addSeoulSessionDays(getSeoulSessionDay(source.startAt), 7)');
    expect(detail).toContain('onSessionCreated(created)');
    expect(manage).toContain('setEditing(created)');
    expect(manage).toContain('setSelectedDay(day)');
  });
});
