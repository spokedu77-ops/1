import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/app/lib/server/adminAuth';
import { canAccessProgram, requireMoveReportTrackInstructor } from '@/app/lib/server/moveReportAuth';

export const dynamic = 'force-dynamic';

type Body = {
  program_id: string;
  session_number: number;
  session_date: string;
  main_activities?: string[];
};

export async function POST(request: Request) {
  const auth = await requireMoveReportTrackInstructor();
  if (!auth.ok) return auth.response;

  let body: Body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.program_id || !body.session_number || !body.session_date) {
    return NextResponse.json({ error: 'program_id, session_number, session_date required' }, { status: 400 });
  }

  const allowed = await canAccessProgram(auth.userId, body.program_id, {
    isAdmin: auth.isAdmin,
    allowViewer: false,
  });
  if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from('mr_track_sessions')
    .insert({
      program_id: body.program_id,
      session_number: body.session_number,
      session_date: body.session_date,
      instructor_id: auth.userId,
      main_activities: body.main_activities ?? [],
      status: 'in_progress',
      created_by: auth.userId,
    })
    .select('id, program_id, session_number, session_date, status, main_activities')
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: '이미 존재하는 회기 번호입니다.' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}
