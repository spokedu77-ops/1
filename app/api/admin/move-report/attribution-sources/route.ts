import { NextResponse } from 'next/server';
import { getServiceSupabase, requireAdmin } from '@/app/lib/server/adminAuth';
import { classifyMoveReportEventSource, type MoveReportSourceBucket } from '@/app/move-report/lib/moveReportSourceClassify';

type MetaRow = { meta: unknown; event_name?: string };

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const supabase = getServiceSupabase();
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from('move_report_events')
      .select('meta, event_name')
      .gte('created_at', since)
      .limit(50000);

    if (error) {
      console.error('[admin/move-report/attribution-sources]', error);
      return NextResponse.json({ ok: false, error: '출처 요약 조회 중 오류가 발생했어요.' }, { status: 500 });
    }

    const counts = new Map<string, { count: number; bucket: MoveReportSourceBucket }>();

    for (const row of (data ?? []) as MetaRow[]) {
      const en = typeof row.event_name === 'string' ? row.event_name : '';
      const { label, bucket } = classifyMoveReportEventSource(row.meta, en);
      const prev = counts.get(label);
      counts.set(label, { count: (prev?.count ?? 0) + 1, bucket });
    }

    const top = [...counts.entries()]
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 30)
      .map(([source, { count, bucket }]) => ({ source, count, bucket }));

    return NextResponse.json({
      ok: true,
      windowDays: 30,
      totalEventsWithMeta: (data ?? []).length,
      top,
    });
  } catch (e) {
    console.error('[admin/move-report/attribution-sources] unexpected', e);
    return NextResponse.json({ ok: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
