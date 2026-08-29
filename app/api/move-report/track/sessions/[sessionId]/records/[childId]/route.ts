import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/app/lib/server/adminAuth';
import {
  normalizeRecordPayload,
  upsertSessionChildRecord,
} from '@/app/lib/server/moveReportTrackRecords';
import { canAccessProgram, requireMoveReportTrackInstructor } from '@/app/lib/server/moveReportAuth';
import {
  partitionValidationIssues,
  validateSessionChildRecord,
} from '@/app/lib/move-report/track/recordValidation';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ sessionId: string; childId: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  const auth = await requireMoveReportTrackInstructor();
  if (!auth.ok) return auth.response;

  const { sessionId, childId } = await ctx.params;
  const supabase = getServiceSupabase();

  const { data: session } = await supabase
    .from('mr_track_sessions')
    .select('id, program_id')
    .eq('id', sessionId)
    .maybeSingle();
  if (!session) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const allowed = await canAccessProgram(auth.userId, session.program_id, {
    isAdmin: auth.isAdmin,
    allowViewer: false,
  });
  if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { data: child } = await supabase
    .from('mr_children')
    .select('id, child_code, child_name')
    .eq('id', childId)
    .maybeSingle();
  if (!child) return NextResponse.json({ error: 'Child not found' }, { status: 404 });

  const { data: record } = await supabase
    .from('mr_session_child_records')
    .select('*')
    .eq('session_id', sessionId)
    .eq('child_id', childId)
    .maybeSingle();

  let movement_experiences: { domain: string; subtag: string }[] = [];
  if (record?.id) {
    const { data: mx } = await supabase
      .from('mr_movement_experiences')
      .select('domain, subtag')
      .eq('session_child_record_id', record.id);
    movement_experiences = mx ?? [];
  }

  return NextResponse.json({ data: { child, record, movement_experiences } });
}

export async function PUT(request: Request, ctx: Ctx) {
  const auth = await requireMoveReportTrackInstructor();
  if (!auth.ok) return auth.response;

  const { sessionId, childId } = await ctx.params;
  const supabase = getServiceSupabase();

  const { data: session } = await supabase
    .from('mr_track_sessions')
    .select('id, program_id')
    .eq('id', sessionId)
    .maybeSingle();
  if (!session) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const allowed = await canAccessProgram(auth.userId, session.program_id, {
    isAdmin: auth.isAdmin,
    allowViewer: false,
  });
  if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { data: enrollment } = await supabase
    .from('mr_program_children')
    .select('id')
    .eq('program_id', session.program_id)
    .eq('child_id', childId)
    .maybeSingle();
  if (!enrollment) return NextResponse.json({ error: 'Child not in program' }, { status: 400 });

  let input;
  try {
    input = normalizeRecordPayload(await request.json());
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Invalid body' }, { status: 400 });
  }

  const issues = validateSessionChildRecord(input);
  const { blocking, warnings } = partitionValidationIssues(issues);
  if (blocking.length > 0) {
    return NextResponse.json({ error: blocking[0].message, issues: blocking }, { status: 400 });
  }

  try {
    const result = await upsertSessionChildRecord(supabase, {
      sessionId,
      childId,
      userId: auth.userId,
      input,
    });
    return NextResponse.json({ data: result, warnings });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Save failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
