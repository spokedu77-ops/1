import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/app/lib/server/adminAuth';

export async function POST() {
  const supabase = getServiceSupabase();
  const now = new Date().toISOString();

  const { data: endedSessions } = await supabase
    .from('sessions')
    .select('id')
    .lt('end_at', now)
    .in('status', ['opened', null])
    .not('status', 'in', '("cancelled","postponed","deleted")');

  if (endedSessions?.length) {
    await supabase.from('sessions').update({ status: 'finished' }).in('id', endedSessions.map(s => s.id));
  }

  return NextResponse.json({ ok: true, count: endedSessions?.length || 0 });
}
