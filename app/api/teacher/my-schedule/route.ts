/**
 * 선생님 주간 스케줄 세션 목록 (Service Role 사용 → RLS 무관, 보조 선생님 포함)
 * GET ?from=<ISO>&to=<ISO> : 로그인한 사용자의 주강사 + 보조 강사 수업 모두 반환
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/app/lib/supabase/server';
import { getServiceSupabase } from '@/app/lib/server/adminAuth';
import { devLogger } from '@/app/lib/logging/devLogger';

type ExtraTeacher = { id: string; price?: number };

function getExtraTeachersFromSession(s: { students_text?: string | null; memo?: string | null }): ExtraTeacher[] {
  for (const raw of [s.memo, s.students_text]) {
    if (!raw?.includes('EXTRA_TEACHERS:')) continue;
    try {
      const arr = JSON.parse(raw.split('EXTRA_TEACHERS:')[1].trim()) as ExtraTeacher[];
      if (Array.isArray(arr) && arr.length > 0) return arr;
    } catch {
      // ignore
    }
  }
  return [];
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    if (!from || !to) {
      return NextResponse.json({ error: 'from, to query params required' }, { status: 400 });
    }

    const svc = getServiceSupabase();

    const [mainRes, extraMemoRes, extraStudentsRes] = await Promise.all([
      svc.from('sessions').select('*')
        .eq('created_by', user.id)
        .gte('start_at', from)
        .lte('start_at', to),
      svc.from('sessions').select('*')
        .ilike('memo', '%EXTRA_TEACHERS%')
        .gte('start_at', from)
        .lte('start_at', to),
      svc.from('sessions').select('*')
        .ilike('students_text', '%EXTRA_TEACHERS%')
        .gte('start_at', from)
        .lte('start_at', to),
    ]);

    const mainList = mainRes.data || [];
    const mainIds = new Set(mainList.map((s) => s.id));
    const myId = String(user.id).trim().toLowerCase();
    const isMe = (ex: ExtraTeacher) => String(ex.id).trim().toLowerCase() === myId;

    const extraRowsById = new Map<string, (typeof mainList)[number]>();
    for (const s of [...(extraMemoRes.data || []), ...(extraStudentsRes.data || [])]) {
      if (!mainIds.has(s.id) && !extraRowsById.has(s.id)) extraRowsById.set(s.id, s);
    }
    const extraList = Array.from(extraRowsById.values()).filter((s) => {
      const extras = getExtraTeachersFromSession(s);
      return extras.some(isMe);
    });

    const combined = [...mainList, ...extraList].sort(
      (a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime()
    );

    return NextResponse.json({ data: combined });
  } catch (err) {
    devLogger.error('[teacher/my-schedule]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
