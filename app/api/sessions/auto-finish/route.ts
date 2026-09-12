import { NextResponse } from 'next/server';
import { getServiceSupabase, requireAdmin } from '@/app/lib/server/adminAuth';

export async function POST() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const supabase = getServiceSupabase();
  const now = new Date().toISOString();

  const { data: endedSessions } = await supabase
    .from('sessions')
    .select('id')
    .lt('end_at', now)
    .or('status.eq.opened,status.is.null')
    .not('status', 'in', '("cancelled","postponed","deleted")');

  if (endedSessions?.length) {
    await supabase
      .from('sessions')
      .update({ status: 'finished' })
      .in('id', endedSessions.map((s: { id: string }) => s.id));
  }

  return NextResponse.json({ ok: true, count: endedSessions?.length || 0 });
}
