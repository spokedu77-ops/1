import { NextResponse } from 'next/server';
import { getServiceSupabase, requireAdmin } from '@/app/lib/server/adminAuth';

type MetaRow = { meta: unknown };
type AttrType = 'utm_source' | 'referrer_host' | 'none';

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

    const counts = new Map<string, { count: number; type: AttrType }>();

    for (const row of (data ?? []) as MetaRow[]) {
      const m = row.meta as { attribution?: Record<string, string> } | null | undefined;
      const utmSrc = m?.attribution?.utm_source?.trim() ?? '';
      const refHost = m?.attribution?.referrer_host?.trim() ?? '';

      let key: string;
      let type: AttrType;

      if (utmSrc) {
        key = utmSrc;
        type = 'utm_source';
      } else if (refHost) {
        key = refHost;
        type = 'referrer_host';
      } else {
        key = '(직접 접속)';
        type = 'none';
      }

      const prev = counts.get(key);
      counts.set(key, { count: (prev?.count ?? 0) + 1, type });
    }

    const top = [...counts.entries()]
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 25)
      .map(([source, { count, type }]) => ({ source, type, count }));

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
