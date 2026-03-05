/**
 * 선생님 정산용 세션 목록 (Service Role 사용 → RLS 무관, 보조 선생님 포함)
 * GET: 로그인한 사용자의 주강사 + 보조 강사 수업 모두 반환
 */
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/app/lib/supabase/server';
import { getServiceSupabase } from '@/app/lib/server/adminAuth';

type ExtraTeacher = { id: string; price?: number };

type SessionRow = {
  id: string;
  title: string | null;
  price: number | null;
  start_at: string;
  status: string;
  students_text?: string | null;
  memo?: string | null;
};

/** 추가 강사 정보: 수업 관리에서 memo에 저장됨. memo 우선, 없으면 students_text 확인 */
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

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const svc = getServiceSupabase();
    const selectCols = 'id, title, price, start_at, status, students_text, memo';
    const statusFilter = ['finished', 'verified'] as const;

    const [mainRes, extraMemoRes, extraStudentsRes] = await Promise.all([
      svc.from('sessions').select(selectCols).eq('created_by', user.id).in('status', statusFilter).order('start_at', { ascending: false }).limit(500),
      svc.from('sessions').select(selectCols).in('status', statusFilter).ilike('memo', '%EXTRA_TEACHERS%').order('start_at', { ascending: false }).limit(500),
      svc.from('sessions').select(selectCols).in('status', statusFilter).ilike('students_text', '%EXTRA_TEACHERS%').order('start_at', { ascending: false }).limit(500),
    ]);

    const mainList = (mainRes.data || []).map((s) => ({
      id: s.id,
      title: s.title,
      price: Number(s.price) || 0,
      start_at: s.start_at,
      status: s.status,
    }));
    const mainIds = new Set(mainList.map((s) => s.id));
    const myId = String(user.id).trim().toLowerCase();
    const isMe = (ex: ExtraTeacher) => String(ex.id).trim().toLowerCase() === myId;

    const extraRowsById = new Map<string, SessionRow>();
    for (const s of [...(extraMemoRes.data || []), ...(extraStudentsRes.data || [])]) {
      if (!mainIds.has(s.id) && !extraRowsById.has(s.id)) extraRowsById.set(s.id, s);
    }
    const extraOnly = Array.from(extraRowsById.values())
      .filter((s) => {
        const extras = getExtraTeachersFromSession(s);
        return extras.some(isMe);
      })
      .map((s) => {
        const extras = getExtraTeachersFromSession(s);
        const me = extras.find(isMe);
        return {
          id: s.id,
          title: s.title,
          price: Number(me?.price) || 0,
          start_at: s.start_at,
          status: s.status,
        };
      });

    const combined = [...mainList, ...extraOnly].sort(
      (a, b) => new Date(b.start_at).getTime() - new Date(a.start_at).getTime()
    );

    return NextResponse.json({ data: combined });
  } catch (err) {
    console.error('[teacher/settlement-sessions]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
