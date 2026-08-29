import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/app/lib/server/adminAuth';
import { canAccessProgram, requireMoveReportTrackInstructor } from '@/app/lib/server/moveReportAuth';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ sessionId: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  const auth = await requireMoveReportTrackInstructor();
  if (!auth.ok) return auth.response;

  const { sessionId } = await ctx.params;
  const supabase = getServiceSupabase();

  const { data: session, error } = await supabase
    .from('mr_track_sessions')
    .select('id, program_id, session_number, session_date, status, main_activities')
    .eq('id', sessionId)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!session) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const allowed = await canAccessProgram(auth.userId, session.program_id, {
    isAdmin: auth.isAdmin,
    allowViewer: false,
  });
  if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { data: enrollments } = await supabase
    .from('mr_program_children')
    .select('child_id')
    .eq('program_id', session.program_id);

  const childIds = (enrollments ?? []).map((e) => e.child_id);
  const { data: children } = childIds.length
    ? await supabase.from('mr_children').select('id, child_code, child_name').in('id', childIds)
    : { data: [] };

  const { data: records } = await supabase
    .from('mr_session_child_records')
    .select('child_id, is_draft, attendance_status, updated_at')
    .eq('session_id', sessionId);

  const { data: program } = await supabase
    .from('mr_programs')
    .select('id, program_name, total_sessions')
    .eq('id', session.program_id)
    .maybeSingle();

  return NextResponse.json({
    data: {
      session,
      program,
      children: children ?? [],
      records: records ?? [],
    },
  });
}
