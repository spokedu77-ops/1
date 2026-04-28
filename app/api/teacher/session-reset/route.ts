/**
 * 선생님 세션 피드백 초기화 — 서버에서 담당 여부 검증 후 Service Role로 갱신
 */
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/app/lib/supabase/server';
import { getServiceSupabase } from '@/app/lib/server/adminAuth';
import { devLogger } from '@/app/lib/logging/devLogger';

type Body = { sessionId?: unknown };

export async function POST(req: Request) {
  try {
    const serverSupabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await serverSupabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = (await req.json().catch(() => ({}))) as Body;
    const sessionId = typeof body.sessionId === 'string' ? body.sessionId.trim() : '';
    if (!sessionId) return NextResponse.json({ error: 'sessionId이 필요합니다.' }, { status: 400 });

    const svc = getServiceSupabase();
    const { data: row, error: fetchErr } = await svc
      .from('sessions')
      .select('id, created_by')
      .eq('id', sessionId)
      .maybeSingle();

    if (fetchErr) {
      devLogger.error('[teacher/session-reset] fetch', fetchErr);
      return NextResponse.json({ error: '세션을 불러오지 못했습니다.' }, { status: 500 });
    }
    if (!row) return NextResponse.json({ error: '세션을 찾을 수 없습니다.' }, { status: 404 });
    if (String(row.created_by || '') !== String(user.id)) {
      return NextResponse.json({ error: '이 수업을 수정할 권한이 없습니다.' }, { status: 403 });
    }

    const { error: upErr } = await svc
      .from('sessions')
      .update({
        status: 'pending',
        students_text: null,
        feedback_fields: {},
        photo_url: [],
        file_url: [],
      })
      .eq('id', sessionId)
      .eq('created_by', user.id);

    if (upErr) {
      devLogger.error('[teacher/session-reset] update', upErr);
      return NextResponse.json({ error: upErr.message || '초기화에 실패했습니다.' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    devLogger.error('[teacher/session-reset]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

