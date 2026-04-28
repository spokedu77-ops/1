/**
 * 선생님 수업안 저장/삭제 — 서버에서 담당 여부 검증 후 Service Role로 처리
 */
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/app/lib/supabase/server';
import { getServiceSupabase } from '@/app/lib/server/adminAuth';
import { devLogger } from '@/app/lib/logging/devLogger';

type SaveBody = {
  action: 'save';
  sessionId?: unknown;
  lessonPlanId?: unknown;
  content?: unknown;
};

type DeleteBody = {
  action: 'delete';
  sessionId?: unknown;
  lessonPlanId?: unknown;
};

type Body = SaveBody | DeleteBody;

export async function POST(req: Request) {
  try {
    const serverSupabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await serverSupabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = (await req.json().catch(() => ({}))) as Body;
    const action = (body as { action?: unknown }).action;
    if (action !== 'save' && action !== 'delete') {
      return NextResponse.json({ error: 'invalid_action' }, { status: 400 });
    }

    const sessionId = typeof body.sessionId === 'string' ? body.sessionId.trim() : '';
    if (!sessionId) return NextResponse.json({ error: 'sessionId이 필요합니다.' }, { status: 400 });

    const svc = getServiceSupabase();
    const { data: sessionRow, error: sErr } = await svc
      .from('sessions')
      .select('id, created_by')
      .eq('id', sessionId)
      .maybeSingle();

    if (sErr) {
      devLogger.error('[teacher/lesson-plan] session fetch', sErr);
      return NextResponse.json({ error: '세션을 불러오지 못했습니다.' }, { status: 500 });
    }
    if (!sessionRow) return NextResponse.json({ error: '세션을 찾을 수 없습니다.' }, { status: 404 });
    if (String(sessionRow.created_by || '') !== String(user.id)) {
      return NextResponse.json({ error: '이 수업을 수정할 권한이 없습니다.' }, { status: 403 });
    }

    if (action === 'delete') {
      const lessonPlanId = typeof body.lessonPlanId === 'string' ? body.lessonPlanId.trim() : '';
      if (!lessonPlanId) return NextResponse.json({ error: 'lessonPlanId이 필요합니다.' }, { status: 400 });

      const { error: delErr } = await svc
        .from('lesson_plans')
        .delete()
        .eq('id', lessonPlanId)
        .eq('session_id', sessionId);

      if (delErr) {
        devLogger.error('[teacher/lesson-plan] delete', delErr);
        return NextResponse.json({ error: delErr.message || '삭제에 실패했습니다.' }, { status: 500 });
      }
      return NextResponse.json({ ok: true });
    }

    // save
    const content = typeof body.content === 'string' ? body.content : '';
    if (!content.trim()) return NextResponse.json({ error: 'content이 필요합니다.' }, { status: 400 });

    const lessonPlanId = typeof body.lessonPlanId === 'string' ? body.lessonPlanId.trim() : '';
    if (lessonPlanId) {
      const { error: upErr } = await svc
        .from('lesson_plans')
        .update({ content, updated_at: new Date().toISOString() })
        .eq('id', lessonPlanId)
        .eq('session_id', sessionId);
      if (upErr) {
        devLogger.error('[teacher/lesson-plan] update', upErr);
        return NextResponse.json({ error: upErr.message || '저장에 실패했습니다.' }, { status: 500 });
      }
      return NextResponse.json({ ok: true, lessonPlanId });
    }

    const { data: inserted, error: insErr } = await svc
      .from('lesson_plans')
      .insert({ session_id: sessionId, content })
      .select('id')
      .single();

    if (insErr) {
      devLogger.error('[teacher/lesson-plan] insert', insErr);
      return NextResponse.json({ error: insErr.message || '저장에 실패했습니다.' }, { status: 500 });
    }
    return NextResponse.json({ ok: true, lessonPlanId: inserted?.id });
  } catch (err) {
    devLogger.error('[teacher/lesson-plan]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

