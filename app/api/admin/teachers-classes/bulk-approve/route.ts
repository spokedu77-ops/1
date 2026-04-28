import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, getServiceSupabase } from '@/app/lib/server/adminAuth';
import { parseExtraTeachers } from '@/app/admin/classes-shared/lib/sessionUtils';

type Body = { ids: string[] };

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const ids = Array.isArray(body?.ids) ? body.ids.filter((v) => typeof v === 'string' && v.trim()) : [];
  if (ids.length === 0) return NextResponse.json({ error: 'no_ids' }, { status: 400 });

  const supabase = getServiceSupabase();
  const { data: rows, error: fetchErr } = await supabase
    .from('sessions')
    .select('id, title, memo, created_by')
    .in('id', ids);
  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 400 });

  const { error } = await supabase
    .from('sessions')
    .update({ status: 'verified', updated_at: new Date().toISOString() })
    .in('id', ids);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  for (const s of rows ?? []) {
    const sessionId = (s as { id?: string }).id;
    if (!sessionId) continue;

    const createdBy = (s as { created_by?: string | null }).created_by ?? null;
    const title = (s as { title?: string | null }).title ?? null;
    const memo = (s as { memo?: string | null }).memo ?? '';

    if (createdBy && String(createdBy).trim()) {
      const { error: logErr } = await supabase.from('session_count_logs').insert({
        teacher_id: createdBy,
        session_id: sessionId,
        session_title: title,
        count_change: 1,
        reason: '검수 완료',
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
          session_id: sessionId,
          session_title: title,
          count_change: 1,
          reason: '검수 완료 (보조)',
        });
        if (exLog && (exLog as { code?: string }).code !== '23505' && (exLog as { code?: string }).code !== '23503') {
          return NextResponse.json({ error: exLog.message }, { status: 400 });
        }
      }
    }
  }

  return NextResponse.json({ ok: true });
}

