import { getServiceSupabase } from '@/app/lib/server/adminAuth';
import { privateNoStoreJson, withPrivateNoStore } from '@/app/lib/server/privateNoStore';
import { requireSpokeduMasterCapability } from '@/app/lib/server/spokeduMasterAccess';
import { LOCKED_ROSTER_MESSAGE, lockedRosterStudentIdsEqual } from '@/app/spokedu-master/lib/sessionIntegrity';

export async function PUT(request: Request, context: { params: Promise<{ sessionId: string }> }) {
  const access = await requireSpokeduMasterCapability('attendance');
  if (!access.ok) return withPrivateNoStore(access.response);
  const { sessionId } = await context.params;
  const body = await request.json().catch(() => null);
  if (!body || !Array.isArray(body.attendance)) return privateNoStoreJson({ error: 'Invalid attendance' }, { status: 400 });
  const attendance = body.attendance.map((item: unknown) => {
    const value = item as Record<string, unknown>;
    return { studentId: value.studentId, status: value.status };
  });
  if (attendance.some((item: { studentId: unknown; status: unknown }) => typeof item.studentId !== 'string' || (item.status !== 'present' && item.status !== 'absent'))) {
    return privateNoStoreJson({ error: 'Invalid attendance' }, { status: 400 });
  }
  const supabase = getServiceSupabase();
  let { data: session, error: sessionError } = await supabase.from('spokedu_master_sessions')
    .select('roster_locked_at,spokedu_master_session_attendance(student_id)')
    .eq('id', sessionId).eq('owner_id', access.userId).is('deleted_at', null).maybeSingle();
  if (sessionError && String(sessionError.message ?? '').includes('roster_locked_at')) {
    ({ data: session, error: sessionError } = await supabase.from('spokedu_master_sessions')
      .select('spokedu_master_session_attendance(student_id)')
      .eq('id', sessionId).eq('owner_id', access.userId).is('deleted_at', null).maybeSingle());
    if (session) session = { ...session, roster_locked_at: null };
  }
  if (sessionError) return privateNoStoreJson({ error: 'Attendance could not be saved' }, { status: 500 });
  if (!session) return privateNoStoreJson({ error: 'Session not found' }, { status: 404 });
  if (session.roster_locked_at) {
    const lockedIds = ((session.spokedu_master_session_attendance ?? []) as Array<{ student_id: string }>).map((item) => item.student_id);
    const submittedIds = attendance.map((item: { studentId: unknown }) => String(item.studentId));
    if (!lockedRosterStudentIdsEqual(lockedIds, submittedIds)) {
      return privateNoStoreJson({ error: LOCKED_ROSTER_MESSAGE }, { status: 400 });
    }
  }
  const { error } = await supabase.rpc('spokedu_master_replace_session_attendance', {
    p_owner_id: access.userId, p_session_id: sessionId, p_attendance: attendance,
  });
  if (error) {
    const message = String(error.message ?? '');
    const locked = error.code === '22023' && message.includes('locked roster');
    return privateNoStoreJson({
      error: locked ? LOCKED_ROSTER_MESSAGE : error.code === '22023' ? 'Attendance cannot be changed' : 'Attendance could not be saved',
    }, { status: error.code === '22023' ? 400 : 500 });
  }
  return privateNoStoreJson({ ok: true });
}
