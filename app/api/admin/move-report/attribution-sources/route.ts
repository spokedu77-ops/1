import { NextResponse } from 'next/server';
import { getServiceSupabase, requireAdmin } from '@/app/lib/server/adminAuth';

type MetaRow = { meta: unknown };

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const supabase = getServiceSupabase();
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from('move_report_events')
      .select('meta')
      .gte('created_at', since)
      .limit(30000);

    if (error) {
      console.error('[admin/move-report/attribution-sources]', error);
      return NextResponse.json({ ok: false, error: '출처 요약 조회 중 오류가 발생했어요.' }, { status: 500 });
    }

    const counts = new Map<string, number>();
    for (const row of (data ?? []) as MetaRow[]) {
      const m = row.meta as { attribution?: Record<string, string> } | null | undefined;
      const src = (m?.attribution?.utm_source ?? '').trim();
      const key = src || '(utm_source 없음)';
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    const top = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 25)
      .map(([source, count]) => ({ source, count }));

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
