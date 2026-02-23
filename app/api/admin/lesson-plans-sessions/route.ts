/**
 * 수업안 조회 API (service_role로 RLS 무시 → 작성된 수업안이 정상 반환됨)
 * GET ?teacherId=all|{uuid} → 최근 1주 세션 + lesson_plans + users
 * 운영진(role / is_admin / name)만 호출 가능.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerSupabaseClient } from '@/app/lib/supabase/server';

async function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error('Server configuration error');
  return createClient(url, serviceKey);
}

const ADMIN_NAMES = ['최지훈', '김구민', '김윤기'];

function isAdminRole(r: string | null | undefined): boolean {
  if (!r || typeof r !== 'string') return false;
  const lower = r.trim().toLowerCase();
  return lower === 'admin' || lower === 'master';
}

/** 로그인 + 운영진 여부 (role / is_admin / name) */
async function requireAdmin(
  serverSupabase: Awaited<ReturnType<typeof createServerSupabaseClient>>
): Promise<{ ok: true } | { ok: false; status: 401 | 403 }> {
  const { data: { user } } = await serverSupabase.auth.getUser();
  if (!user) return { ok: false, status: 401 };

  const { data: userRow } = await serverSupabase
    .from('users')
    .select('role, is_admin, name')
    .eq('id', user.id)
    .maybeSingle();
  const u = userRow as { role?: string; is_admin?: boolean; name?: string } | null;
  if (u && (isAdminRole(u.role) || u.is_admin === true || (typeof u.name === 'string' && ADMIN_NAMES.includes(u.name))))
    return { ok: true };

  const { data: profileRow } = await serverSupabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();
  const p = profileRow as { role?: string } | null;
  if (p && isAdminRole(p.role)) return { ok: true };

  return { ok: false, status: 403 };
}

/** GET: 최근 1주 세션 + 수업안 + 선생님 (service role → RLS 없이 lesson_plans 포함) */
export async function GET(request: NextRequest) {
  try {
    const serverSupabase = await createServerSupabaseClient();
    const auth = await requireAdmin(serverSupabase);
    if (!auth.ok) {
      return NextResponse.json(
        { error: auth.status === 401 ? 'Unauthorized' : 'Forbidden' },
        { status: auth.status }
      );
    }

    const { searchParams } = new URL(request.url);
    const teacherId = searchParams.get('teacherId') ?? 'all';

    // 이번 주: 일요일 00:00 ~ 토요일 23:59 (일요일이 주의 시작)
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0=일, 1=월, ...
    const start = new Date(now);
    start.setDate(now.getDate() - dayOfWeek);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);

    const supabase = await getServiceSupabase();
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
