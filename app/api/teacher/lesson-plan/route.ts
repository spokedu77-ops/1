/** Teacher identity is server-derived; the DB locks ownership and write together. */
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/app/lib/supabase/server';
import { canAccessTeacherMaterials } from '@/app/lib/server/teacherAuth';
import { getServiceSupabase } from '@/app/lib/server/adminAuth';
import { devLogger } from '@/app/lib/logging/devLogger';
import { lessonPlanWriteError } from '@/app/lib/teacher/lessonPlan';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(req: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!(await canAccessTeacherMaterials(user, supabase))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const sessionId = new URL(req.url).searchParams.get('sessionId') ?? '';
    if (!UUID.test(sessionId)) return NextResponse.json({ error: 'Invalid session' }, { status: 400 });
    const { data, error } = await getServiceSupabase().rpc('teacher_read_lesson_plan_history', {
      p_session_id: sessionId, p_teacher_id: user.id,
    });
    if (error) {
      const mapped = lessonPlanWriteError(error.message);
      return NextResponse.json({ error: mapped.message }, { status: mapped.status });
    }
    return NextResponse.json({ plans: data ?? [] }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ error: '이전 수업안을 불러오지 못했습니다.' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const serverSupabase = await createServerSupabaseClient();
    const { data: { user } } = await serverSupabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!(await canAccessTeacherMaterials(user, serverSupabase))) {
      return NextResponse.json({ error: 'Forbidden', reason: 'inactive_teacher' }, { status: 403 });
    }
    const body = await req.json().catch(() => null);
    if (!body || (body.action !== 'save' && body.action !== 'delete')) {
      return NextResponse.json({ error: 'invalid_action' }, { status: 400 });
    }
    const sessionId = typeof body.sessionId === 'string' ? body.sessionId.trim() : '';
    const planId = typeof body.lessonPlanId === 'string' ? body.lessonPlanId.trim() : '';
    if (!UUID.test(sessionId) || (planId && !UUID.test(planId)) || (body.action === 'delete' && !planId)) {
      return NextResponse.json({ error: '수업 정보가 올바르지 않습니다. 수업을 다시 열어 주세요.' }, { status: 400 });
    }
    const content = typeof body.content === 'string' ? body.content : '';
    if (body.action === 'save' && !content.trim()) {
      return NextResponse.json({ error: '수업안 내용을 입력해 주세요.' }, { status: 400 });
    }
    const { data, error } = await getServiceSupabase().rpc('teacher_write_lesson_plan', {
      p_session_id: sessionId, p_teacher_id: user.id,
      p_lesson_plan_id: planId || null, p_content: content, p_action: body.action,
    });
    if (error) {
      const mapped = lessonPlanWriteError(error.message);
      devLogger.error('[teacher/lesson-plan] write', { code: error.code, message: error.message });
      return NextResponse.json({ error: mapped.message }, { status: mapped.status });
    }
    return NextResponse.json(data);
  } catch (err) {
    devLogger.error('[teacher/lesson-plan]', err);
    return NextResponse.json({ error: '수업안을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.' }, { status: 500 });
  }
}
