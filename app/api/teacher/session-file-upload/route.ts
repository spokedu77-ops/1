import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/app/lib/supabase/server';
import { getServiceSupabase } from '@/app/lib/server/adminAuth';
import { parseExtraTeachers } from '@/app/admin/classes-shared/lib/sessionUtils';
import { isCenterSessionType } from '@/app/admin/classes-v2/lib/sessionTypeCategory';
import { devLogger } from '@/app/lib/logging/devLogger';
import { CENTER_SESSION_FILES_BUCKET } from '@/app/lib/server/centerSessionFileStorage';

const MAX_FILE_BYTES = 25 * 1024 * 1024;

function canEdit(userId: string, row: { created_by?: string | null; memo?: string | null; students_text?: string | null }) {
  if (String(row.created_by || '') === userId) return true;
  for (const raw of [row.memo, row.students_text]) {
    if (!raw?.includes('EXTRA_TEACHERS:')) continue;
    if (parseExtraTeachers(raw).extraTeachers.some((teacher) => String(teacher.id || '') === userId)) return true;
  }
  return false;
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
  let uploadedPath: string | null = null;
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const form = await request.formData();
    const sessionId = typeof form.get('sessionId') === 'string' ? String(form.get('sessionId')).trim() : '';
    const file = form.get('file');
    if (!sessionId || !(file instanceof File)) {
      return NextResponse.json({ error: '수업과 파일 정보가 필요합니다.' }, { status: 400 });
    }
    if (file.size <= 0 || file.size > MAX_FILE_BYTES) {
      return NextResponse.json({ error: '파일은 25MB 이하만 업로드할 수 있습니다.' }, { status: 413 });
    }

    const service = getServiceSupabase();
    const { data: row, error: rowError } = await service.from('sessions')
      .select('id, created_by, memo, students_text, session_type')
      .eq('id', sessionId).maybeSingle();
    if (rowError) throw rowError;
    if (!row) return NextResponse.json({ error: '수업을 찾을 수 없습니다.' }, { status: 404 });
    if (!isCenterSessionType(String(row.session_type || ''))) {
      return NextResponse.json({ error: '센터 수업 첨부만 업로드할 수 있습니다.' }, { status: 400 });
    }
    if (!canEdit(user.id, row)) {
      return NextResponse.json({ error: '이 수업의 첨부 권한이 없습니다.' }, { status: 403 });
    }

    uploadedPath = `${sessionId}/${safeObjectName(file.name || 'file')}`;
    const { error: uploadError } = await service.storage.from(CENTER_SESSION_FILES_BUCKET).upload(
      uploadedPath,
      new Uint8Array(await file.arrayBuffer()),
      { contentType: file.type || 'application/octet-stream', upsert: false },
    );
    if (uploadError) throw uploadError;
    const { data } = service.storage.from(CENTER_SESSION_FILES_BUCKET).getPublicUrl(uploadedPath);
    return NextResponse.json({ url: data.publicUrl });
  } catch (error) {
    devLogger.error('[teacher/session-file-upload]', error);
    if (uploadedPath) {
      await getServiceSupabase().storage.from(CENTER_SESSION_FILES_BUCKET).remove([uploadedPath]).catch(() => undefined);
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : '파일 업로드에 실패했습니다.' }, { status: 500 });
  }
}
