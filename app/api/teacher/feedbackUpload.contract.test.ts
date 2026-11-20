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
    expect(teacherPage).not.toContain(".from(bucket).upload(");
  });

  it('retains center originals and submits attachment removal only with feedback saving', () => {
    expect(uploadRoute).toContain('export async function DELETE');
    expect(uploadRoute).toContain("path.startsWith(`${sessionId}/`)");
    expect(uploadRoute).toContain('canTeacherEditSession(user.id, row)');
    expect(uploadRoute).toContain('if (bucket === CENTER_SESSION_FILES_BUCKET)');
    expect(uploadRoute.indexOf('return NextResponse.json({ ok: true, retained: true })')).toBeLessThan(uploadRoute.indexOf('.remove([path])'));
    expect(teacherPage).not.toContain("method: 'DELETE'");
    expect(teacherPage).toContain('removedFileUrls');
    expect(feedbackRoute).toContain('removedSet.has(url)');
    expect(teacherPage).not.toContain('supabase.storage.from(SESSION_FILES_BUCKET).remove');
  });

  it('checks that center attachment objects can be signed before persisting feedback', () => {
    expect(feedbackRoute).toContain('parseSessionFilesStorageRef(fileUrl)');
    expect(feedbackRoute).toContain('ref.bucket !== CENTER_SESSION_FILES_BUCKET');
    expect(feedbackRoute).toContain('createSignedUrl(ref.objectPath, 60)');
    expect(feedbackRoute).toContain('if (signError || !signed?.signedUrl)');
    expect(feedbackRoute.indexOf('createSignedUrl(ref.objectPath, 60)')).toBeLessThan(feedbackRoute.indexOf(".rpc('teacher_save_session_feedback'"));
  });

  it('uses one shared main-or-assistant permission contract on both endpoints', () => {
    expect(uploadRoute).toContain('canAccessTeacherMaterials(user, supabase)');
    expect(feedbackRoute).toContain('canAccessTeacherMaterials(user, serverSupabase)');
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
