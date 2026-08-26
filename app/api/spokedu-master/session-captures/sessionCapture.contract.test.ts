import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = readFileSync('supabase/migrations/20260827120000_spokedu_master_session_capture.sql', 'utf8');
const route = readFileSync('app/api/spokedu-master/session-captures/route.ts', 'utf8');

describe('exact Session Capture persistence', () => {
  it('adds nullable exact identity without rewriting legacy records', () => {
    expect(migration).toContain('add column if not exists session_id uuid null');
    expect(migration).toContain('references public.spokedu_master_sessions(id) on delete restrict');
    expect(migration).toContain('where session_id is not null and deleted_at is null');
    expect(migration).not.toMatch(/update public\.spokedu_master_class_records\s+set session_id/i);
  });
  it('is idempotent per owner and Session and saves parent plus children atomically', () => {
    expect(migration).toContain('on conflict (owner_id, session_id)');
    expect(migration).toContain('spokedu_master_save_session_capture');
    expect(migration).toContain('delete from public.spokedu_master_class_record_students');
    expect(migration).toContain('insert into public.spokedu_master_class_record_students');
  });
  it('derives Session and attendance truth server-side under owner scope', () => {
    expect(migration).toContain('id = p_session_id and owner_id = p_owner_id');
    expect(migration).toContain('public.spokedu_master_session_attendance');
    expect(migration).toContain('student.owner_id = p_owner_id');
    expect(route).toContain("requireSpokeduMasterCapability('records')");
    expect(route).not.toContain('class_date:');
  });
  it('does not expose focused, score, skills, attendance or Session memo as Capture input', () => {
    expect(route).not.toContain('observationScore');
    expect(route).not.toContain('body?.focused');
    expect(route).not.toContain('body?.skills');
    expect(route).not.toContain('body?.attendance');
    expect(route).not.toContain('sessionMemo');
  });
});
