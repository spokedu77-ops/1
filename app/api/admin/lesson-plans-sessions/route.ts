/**
 * 수업안 조회 API (service_role로 RLS 무시 → 작성된 수업안이 정상 반환됨)
 * GET ?teacherId=all|{uuid} → 최근 1주 세션 + lesson_plans + users
 * 운영진(role / is_admin / name)만 호출 가능.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, getServiceSupabase } from '@/app/lib/server/adminAuth';

/** GET: 최근 1주 세션 + 수업안 + 선생님 (service role → RLS 없이 lesson_plans 포함) */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(request.url);
    const teacherId = searchParams.get('teacherId') ?? 'all';

    // 이번 주: 일요일 00:00 ~ 토요일 23:59 (KST 기준, UTC+9)
    const KST_OFFSET = 9 * 60 * 60 * 1000;
    const nowKST = new Date(Date.now() + KST_OFFSET);
    const dayOfWeek = nowKST.getUTCDay(); // KST 기준 요일
    const startKST = new Date(nowKST);
    startKST.setUTCDate(nowKST.getUTCDate() - dayOfWeek);
    startKST.setUTCHours(0, 0, 0, 0);
    const endKST = new Date(startKST);
    endKST.setUTCDate(startKST.getUTCDate() + 6);
    endKST.setUTCHours(23, 59, 59, 999);
    // DB는 UTC로 저장되므로 KST 범위를 UTC로 변환
    const start = new Date(startKST.getTime() - KST_OFFSET);
    const end = new Date(endKST.getTime() - KST_OFFSET);

    const supabase = getServiceSupabase();
    let query = supabase
      .from('sessions')
      .select('*, lesson_plans(id, session_id, content), users!created_by(id, name)')
      .in('session_type', ['one_day', 'regular_private'])
      .gte('start_at', start.toISOString())
      .lte('start_at', end.toISOString())
      .order('start_at', { ascending: false });

    if (teacherId !== 'all' && teacherId.trim()) {
      query = query.eq('created_by', teacherId);
    }

    const { data, error } = await query;
    if (error) {
      console.error('[admin/lesson-plans-sessions] GET error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const list = (data ?? []) as Array<Record<string, unknown> & { lesson_plans?: unknown }>;
    const out = list.map((row) => {
      const lp = row.lesson_plans;
      return {
        ...row,
        lesson_plans: Array.isArray(lp) ? lp : lp != null ? [lp] : [],
      };
    });

    return NextResponse.json(out);
  } catch (err) {
    console.error('[admin/lesson-plans-sessions] GET', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
