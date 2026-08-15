import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const uploadRoute = readFileSync(new URL('./session-file-upload/route.ts', import.meta.url), 'utf8');
const feedbackRoute = readFileSync(new URL('./session-feedback/route.ts', import.meta.url), 'utf8');
const teacherPage = readFileSync(new URL('../../teacher/my-classes/page.tsx', import.meta.url), 'utf8');
const migration = readFileSync(
  new URL('../../../supabase/migrations/20260815170000_atomic_teacher_session_feedback.sql', import.meta.url),
  'utf8',
);

describe('teacher center feedback upload contract', () => {
  it('transfers files directly with a one-time signed upload token', () => {
    expect(uploadRoute).toContain('createSignedUploadUrl');
    expect(uploadRoute).not.toContain('request.formData()');
    expect(teacherPage).toContain('uploadToSignedUrl');
  });

  it('uses one shared main-or-assistant permission contract on both endpoints', () => {
    expect(uploadRoute).toContain('canTeacherEditSession(user.id, row)');
    expect(feedbackRoute).toContain('canTeacherEditSession(user.id, row)');
  });

  it('serializes concurrent saves and enforces one-to-two center files in the database', () => {
    expect(feedbackRoute).toContain(".rpc('teacher_save_session_feedback'");
    expect(migration).toContain('for update;');
    expect(migration).toContain("raise exception 'CENTER_FILE_REQUIRED'");
    expect(migration).toContain("raise exception 'CENTER_FILE_LIMIT'");
    expect(migration).toContain('security invoker');
    expect(migration).toContain('from anon');
    expect(migration).toContain('from authenticated');
    expect(migration).toContain('grant execute on function public.teacher_save_session_feedback');
  });
});
