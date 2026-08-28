import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/app/lib/server/adminAuth';
import { requireMoveReportTrackSession } from '@/app/lib/server/moveReportAuth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const auth = await requireMoveReportTrackSession();
  if (!auth.ok) return auth.response;

  const supabase = getServiceSupabase();

  if (auth.isAdmin) {
    const { data, error } = await supabase
      .from('mr_programs')
      .select('id, program_name, status, total_sessions, session_minutes, start_date')
      .order('created_at', { ascending: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data });
  }

  if (auth.role === 'instructor') {
    const { data: links, error: linkErr } = await supabase
      .from('mr_program_instructors')
      .select('program_id')
      .eq('user_id', auth.userId);
    if (linkErr) return NextResponse.json({ error: linkErr.message }, { status: 500 });
    const ids = (links ?? []).map((l) => l.program_id);
    if (ids.length === 0) return NextResponse.json({ data: [] });
    const { data, error } = await supabase
      .from('mr_programs')
      .select('id, program_name, status, total_sessions, session_minutes, start_date')
      .in('id', ids)
      .order('created_at', { ascending: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data });
  }

  const { data: links, error: linkErr } = await supabase
    .from('mr_program_viewers')
    .select('program_id')
    .eq('user_id', auth.userId)
    .eq('impact_report_approved', true);
  if (linkErr) return NextResponse.json({ error: linkErr.message }, { status: 500 });
  const ids = (links ?? []).map((l) => l.program_id);
  if (ids.length === 0) return NextResponse.json({ data: [] });
  const { data, error } = await supabase
    .from('mr_programs')
    .select('id, program_name, status, total_sessions, session_minutes, start_date')
    .in('id', ids)
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
