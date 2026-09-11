import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { readSessionDetailSource } from '../manage/session-detailTestSource';

const read = (path: string) => readFileSync(path, 'utf8');
const migration = read('supabase/migrations/20260911173000_spokedu_master_session_integrity.sql');
const sessionsRoute = read('app/api/spokedu-master/sessions/route.ts');
const nextRoute = read('app/api/spokedu-master/sessions/[sessionId]/next/route.ts');
const scheduleRoute = read('app/api/spokedu-master/classes/[classId]/schedule-rules/route.ts');
const sheet = readSessionDetailSource();

describe('SPOKEDU MASTER session integrity contract', () => {
  it('blocks incomplete attendance at completion in client, API, and DB', () => {
    expect(sheet).toContain('validateCompletionAttendance(attendance.roster.map((student) => student.id), attendance.attendanceInput())');
    expect(sheet).toContain('completionAttendanceMessage(validation.missingCount)');
    expect(sessionsRoute).toContain("input.status === 'completed'");
    expect(sessionsRoute).toContain('수업 완료는 출석 검증을 포함한 완료 요청으로 처리해 주세요.');
    expect(sessionsRoute).toContain('validateCompletionAttendance((memberships ?? []).map((item) => item.student_id), body.attendance)');
    expect(sessionsRoute).toContain("rpc('spokedu_master_complete_session'");
    expect(migration).toContain('spokedu_master_assert_complete_attendance');
    expect(migration).toContain("new.status='completed'");
    expect(migration).toContain('complete attendance must exactly match current class roster');
    expect(migration).not.toContain("status='present'");
    expect(migration).not.toContain('update public.spokedu_master_session_attendance');
  });

  it('unifies same-class overlap across create, next, recurring, and save paths', () => {
    expect(sessionsRoute).toContain('CLASS_TIME_COLLISION_MESSAGE');
    expect(sessionsRoute).toContain('if (sessionId) collisionQuery = collisionQuery.neq(\'id\', sessionId)');
    expect(sessionsRoute).toContain('timeChanged');
    expect(nextRoute).toContain('CLASS_TIME_COLLISION_MESSAGE');
    expect(nextRoute).toContain("rpc('spokedu_master_create_next_session_v2'");
    expect(nextRoute).toContain("rpc('spokedu_master_create_next_session'");
    expect(scheduleRoute).toContain("rpc('spokedu_master_materialize_schedule_rule'");
    expect(scheduleRoute).toContain('CLASS_TIME_COLLISION_MESSAGE');
    expect(migration).toContain('spokedu_master_assert_no_class_time_collision');
    expect(migration).toContain('spokedu_master_create_session_with_activities');
    expect(migration).toContain('spokedu_master_create_next_session_v2');
    expect(migration).toContain('spokedu_master_materialize_schedule_rule');
    expect(migration).toContain("existing.start_at < p_end_at and existing.end_at > p_start_at");
    expect(migration).toContain("existing.status <> 'cancelled'");
  });

  it('uses a class-scoped transaction lock instead of select-then-insert as the final duplicate guard', () => {
    expect(migration).toContain('pg_advisory_xact_lock');
    expect(migration).toContain('spokedu_master_class_integrity_lock');
    expect(migration).toContain('spokedu_master_sessions_time_collision_guard');
    expect(migration).not.toMatch(/exclude using gist/i);
    expect(migration).not.toMatch(/delete from public\.spokedu_master_sessions/i);
  });

  it('does not treat cancelled or deleted sessions as active collisions', () => {
    expect(migration).toContain("new.status='cancelled'");
    expect(migration).toContain('new.deleted_at is not null');
    expect(migration).toContain('existing.deleted_at is null');
  });
});
