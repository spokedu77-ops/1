import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    return NextResponse.json({ error: 'Missing env' }, { status: 500 });
  }

  const supabase = createClient(url, serviceKey);
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
