import { NextResponse } from 'next/server';
import { getServiceSupabase, requireAdmin } from '@/app/lib/server/adminAuth';

/** 퍼널 KPI 원본(`move_report_events`) 전체 삭제 — 운영 전 테스트 데이터 정리용 */
export async function POST() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const supabase = getServiceSupabase();
    const { error, count } = await supabase
      .from('move_report_events')
      .delete({ count: 'exact' })
      .gte('created_at', '1970-01-01T00:00:00Z');

    if (error) {
      console.error('[admin/move-report/events-reset]', error);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, deleted: count ?? 0 });
  } catch (e) {
    console.error('[admin/move-report/events-reset] unexpected', e);
    return NextResponse.json({ ok: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
