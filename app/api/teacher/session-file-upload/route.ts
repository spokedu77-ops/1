import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/app/lib/supabase/server';
import { getServiceSupabase } from '@/app/lib/server/adminAuth';
import { isCenterSessionType } from '@/app/admin/classes/lib/sessionTypeCategory';
import { devLogger } from '@/app/lib/logging/devLogger';
import { CENTER_SESSION_FILES_BUCKET } from '@/app/lib/server/centerSessionFileStorage';
import { canTeacherEditSession } from '@/app/lib/server/teacherSessionAccess';
import { canAccessTeacherMaterials } from '@/app/lib/server/teacherAuth';

const MAX_FILE_BYTES = 25 * 1024 * 1024;
const ALLOWED_BUCKETS = [CENTER_SESSION_FILES_BUCKET, 'session-photos'] as const;
type AllowedBucket = (typeof ALLOWED_BUCKETS)[number];

function parseBucket(value: unknown): AllowedBucket | null {
  return ALLOWED_BUCKETS.find((bucket) => bucket === value) ?? null;
}

function safeObjectName(fileName: string): string {
  const normalized = fileName.normalize('NFC').trim();
  const dot = normalized.lastIndexOf('.');
  const rawBase = dot > 0 ? normalized.slice(0, dot) : normalized;
  const extension = dot > 0 ? normalized.slice(dot).replace(/[^.a-zA-Z0-9]/g, '').slice(0, 12) : '';
  const base = rawBase.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '').slice(0, 120) || 'file';
  return `${Date.now()}_${crypto.randomUUID()}_${base}${extension}`;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!(await canAccessTeacherMaterials(user, supabase))) {
      return NextResponse.json({ error: 'Forbidden', reason: 'inactive_teacher' }, { status: 403 });
    }

    const body = (await request.json().catch(() => null)) as {
      sessionId?: unknown;
      fileName?: unknown;
      fileSize?: unknown;
      bucket?: unknown;
    } | null;
    const sessionId = typeof body?.sessionId === 'string' ? body.sessionId.trim() : '';
    const fileName = typeof body?.fileName === 'string' ? body.fileName.trim() : '';
    const fileSize = typeof body?.fileSize === 'number' ? body.fileSize : Number.NaN;
    const bucket = parseBucket(body?.bucket ?? CENTER_SESSION_FILES_BUCKET);
    if (!sessionId || !fileName || !Number.isFinite(fileSize) || !bucket) {
      return NextResponse.json({ error: '수업과 파일 정보가 필요합니다.' }, { status: 400 });
    }
    if (fileSize <= 0 || fileSize > MAX_FILE_BYTES) {
      return NextResponse.json({ error: '파일은 25MB 이하만 업로드할 수 있습니다.' }, { status: 413 });
    }

    const service = getServiceSupabase();
    const { data: row, error: rowError } = await service.from('sessions')
      .select('id, created_by, memo, students_text, session_type')
      .eq('id', sessionId).maybeSingle();
    if (rowError) throw rowError;
    if (!row) return NextResponse.json({ error: '수업을 찾을 수 없습니다.' }, { status: 404 });
    if (bucket === CENTER_SESSION_FILES_BUCKET && !isCenterSessionType(String(row.session_type || ''))) {
      return NextResponse.json({ error: '센터 수업 첨부만 업로드할 수 있습니다.' }, { status: 400 });
    }
    if (!canTeacherEditSession(user.id, row)) {
      return NextResponse.json({ error: '이 수업의 첨부 권한이 없습니다.' }, { status: 403 });
    }

    const path = `${sessionId}/${safeObjectName(fileName)}`;
    const { data, error: signedUploadError } = await service.storage
      .from(bucket)
      .createSignedUploadUrl(path, { upsert: false });
    if (signedUploadError || !data) throw signedUploadError || new Error('Signed upload URL creation failed.');
    return NextResponse.json({ path: data.path ?? path, token: data.token });
  } catch (error) {
    devLogger.error('[teacher/session-file-upload]', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : '파일 업로드에 실패했습니다.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!(await canAccessTeacherMaterials(user, supabase))) {
      return NextResponse.json({ error: 'Forbidden', reason: 'inactive_teacher' }, { status: 403 });
    }

    const body = (await request.json().catch(() => null)) as {
      sessionId?: unknown;
      bucket?: unknown;
      path?: unknown;
    } | null;
    const sessionId = typeof body?.sessionId === 'string' ? body.sessionId.trim() : '';
    const bucket = parseBucket(body?.bucket);
    const path = typeof body?.path === 'string' ? body.path.trim() : '';
    if (!sessionId || !bucket || !path || !path.startsWith(`${sessionId}/`) || path.includes('..')) {
      return NextResponse.json({ error: 'Invalid storage object.' }, { status: 400 });
    }

    const service = getServiceSupabase();
    const { data: row, error: rowError } = await service.from('sessions')
      .select('id, created_by, memo, students_text, session_type')
      .eq('id', sessionId).maybeSingle();
    if (rowError) throw rowError;
    if (!row) return NextResponse.json({ error: 'Session not found.' }, { status: 404 });
    if (bucket === CENTER_SESSION_FILES_BUCKET && !isCenterSessionType(String(row.session_type || ''))) {
      return NextResponse.json({ error: 'Invalid session file bucket.' }, { status: 400 });
    }
    if (!canTeacherEditSession(user.id, row)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { error } = await service.storage.from(bucket).remove([path]);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    devLogger.error('[teacher/session-file-upload:delete]', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'File deletion failed.' }, { status: 500 });
  }
}
