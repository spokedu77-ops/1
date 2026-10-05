import { NextResponse } from 'next/server';
import { getServiceSupabase, requireAdmin } from '@/app/lib/server/adminAuth';

const SESSION_COLUMNS = 'id, title, start_at, end_at, status, group_id, round_index, round_total, users:created_by(id, name)';

function kstTodayBounds() {
  const ymd = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
  return {
    start: new Date(`${ymd}T00:00:00+09:00`).toISOString(),
    end: new Date(`${ymd}T23:59:59.999+09:00`).toISOString(),
  };
}

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { start, end } = kstTodayBounds();
  const supabase = getServiceSupabase();
  const [todayRes, postponedRes] = await Promise.all([
    supabase
      .from('sessions')
      .select(SESSION_COLUMNS)
      .gte('start_at', start)
      .lte('start_at', end)
      .order('start_at', { ascending: true }),
    supabase
      .from('sessions')
      .select(SESSION_COLUMNS)
      .eq('status', 'postponed')
      .gte('start_at', start)
      .order('start_at', { ascending: true })
      .limit(8),
  ]);

  if (todayRes.error) return NextResponse.json({ error: todayRes.error.message }, { status: 500 });
  if (postponedRes.error) return NextResponse.json({ error: postponedRes.error.message }, { status: 500 });

  return NextResponse.json({
    today: todayRes.data ?? [],
    upcomingPostponed: postponedRes.data ?? [],
  });
}
