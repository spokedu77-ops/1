import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

describe('SPOKEDU MASTER Session workflow', () => {
  it('defines the V1 aggregate without dropping legacy data', () => {
    const sql = read('supabase/migrations/20260821180000_spokedu_master_session_workflow.sql');
    expect(sql).toContain('create table if not exists public.spokedu_master_sessions');
    expect(sql).toContain("status in ('scheduled', 'completed', 'cancelled')");
    expect(sql).toContain('create table if not exists public.spokedu_master_session_programs');
    expect(sql).toContain('sort_order integer not null');
    expect(sql).toContain('is_completed boolean not null');
    expect(sql).toContain('create table if not exists public.spokedu_master_session_attendance');
    expect(sql).toContain("status in ('present', 'absent')");
    expect(sql).toContain('legacy_record_id uuid null');
    expect(sql).not.toMatch(/drop table\s+(if exists\s+)?public\.spokedu_master_class_records/i);
  });

  it('uses the unique session id and keeps program completion independent', () => {
    const api = read('app/api/spokedu-master/sessions/route.ts');
    const calendar = read('app/spokedu-master/activity/page.tsx');
    expect(api).toContain("p_session_id: sessionId");
    expect(api).toContain("'spokedu_master_save_session'");
    expect(calendar).toContain("status: nextStatus");
    expect(calendar).toContain('isCompleted: !item.isCompleted');
    expect(calendar).toContain("void persist('completed')");
    expect(calendar).not.toContain('프로그램별 메모');
  });

  it('assigns a library program only after an exact Session is selected', () => {
    const assign = read('app/spokedu-master/components/session/AssignProgramToSessionButton.tsx');
    expect(assign).toContain('assign(session.id)');
    expect(assign).toContain('data.saveSession');
    expect(assign).toContain('session.id');
    expect(assign).not.toContain('sessions[0]');
  });

  it('retires the standalone record creation route', () => {
    const legacy = read('app/spokedu-master/class-record/page.tsx');
    expect(legacy).toContain("redirect('/spokedu-master/activity')");
    expect(legacy).not.toContain('RecordEntryView');
  });
});
