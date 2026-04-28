import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, getServiceSupabase } from '@/app/lib/server/adminAuth';
import { parseExtraTeachers } from '@/app/admin/classes-shared/lib/sessionUtils';

type SaveBody = {
  sessionId: string;
  status: 'finished' | 'verified';
  students_text: string;
  feedback_fields: unknown;
  photo_url: unknown;
  file_url: unknown;
};

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  let body: SaveBody;
  try {
    body = (await req.json()) as SaveBody;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  if (!body?.sessionId || (body.status !== 'finished' && body.status !== 'verified')) {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  const supabase = getServiceSupabase();

  const { data: row, error: fetchErr } = await supabase
    .from('sessions')
    .select('id, title, memo, created_by')
    .eq('id', body.sessionId)
    .maybeSingle();
  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 400 });

  const { error } = await supabase
    .from('sessions')
    .update({
      status: body.status,
      students_text: body.students_text,
      feedback_fields: body.feedback_fields,
      photo_url: body.photo_url,
      file_url: body.file_url,
      updated_at: new Date().toISOString(),
    })
    .eq('id', body.sessionId);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  if (body.status === 'finished' || body.status === 'verified') {
    const reason = body.status === 'verified' ? '검수 완료' : '작성 완료';
    const createdBy = (row as { created_by?: string | null } | null)?.created_by ?? null;
    const title = (row as { title?: string | null } | null)?.title ?? null;
    const memo = (row as { memo?: string | null } | null)?.memo ?? '';

    if (createdBy && String(createdBy).trim()) {
      const { error: logErr } = await supabase.from('session_count_logs').insert({
        teacher_id: createdBy,
        session_id: body.sessionId,
        session_title: title,
        count_change: 1,
        reason,
      });
      if (logErr && (logErr as { code?: string }).code !== '23505' && (logErr as { code?: string }).code !== '23503') {
        return NextResponse.json({ error: logErr.message }, { status: 400 });
      }
    }

    if (typeof memo === 'string' && memo.includes('EXTRA_TEACHERS:')) {
      const { extraTeachers } = parseExtraTeachers(memo);
      for (const ex of extraTeachers) {
        if (!ex.id) continue;
        const { error: exLog } = await supabase.from('session_count_logs').insert({
          teacher_id: ex.id,
          session_id: body.sessionId,
          session_title: title,
          count_change: 1,
          reason: `${reason} (보조)`,
        });
        if (exLog && (exLog as { code?: string }).code !== '23505' && (exLog as { code?: string }).code !== '23503') {
          return NextResponse.json({ error: exLog.message }, { status: 400 });
        }
      }
    }
  }

  return NextResponse.json({ ok: true });
}

