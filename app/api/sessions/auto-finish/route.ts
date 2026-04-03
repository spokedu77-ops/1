import { NextResponse } from 'next/server';
import { getServiceSupabase, requireAdmin } from '@/app/lib/server/adminAuth';
import { parseExtraTeachers } from '@/app/admin/classes-shared/lib/sessionUtils';

export async function POST() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const supabase = getServiceSupabase();
  const now = new Date().toISOString();

  const { data: endedSessions } = await supabase
    .from('sessions')
    .select('id, created_by, title, memo')
    .lt('end_at', now)
    .or('status.eq.opened,status.is.null')
    .not('status', 'in', '("cancelled","postponed","deleted")');

  if (endedSessions?.length) {
    await supabase.from('sessions').update({ status: 'finished' }).in('id', endedSessions.map((s: { id: string }) => s.id));

    // 수업 카운팅: session_count_logs 반영 (주강사 + 보조강사)
    type Row = { teacher_id: string; session_id: string; session_title: string | null; count_change: number; reason: string };
    const rows: Row[] = [];
    for (const s of endedSessions as { id: string; created_by?: string | null; title?: string | null; memo?: string | null }[]) {
      if (s.created_by && String(s.created_by).trim()) {
        rows.push({ teacher_id: s.created_by, session_id: s.id, session_title: s.title ?? null, count_change: 1, reason: '수업 완료' });
      }
      if (s.memo?.includes('EXTRA_TEACHERS:')) {
        const { extraTeachers } = parseExtraTeachers(s.memo);
        for (const ex of extraTeachers) {
          if (ex.id) rows.push({ teacher_id: ex.id, session_id: s.id, session_title: s.title ?? null, count_change: 1, reason: '수업 완료 (보조)' });
        }
      }
    }
    for (const row of rows) {
      const { error } = await supabase.from('session_count_logs').insert(row);
      if (error && error.code !== '23505' && error.code !== '23503') {
        console.error('session_count_logs insert failed:', error.message);
      }
    }
  }

  return NextResponse.json({ ok: true, count: endedSessions?.length || 0 });
}
