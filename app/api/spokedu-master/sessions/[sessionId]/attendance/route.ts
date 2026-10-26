import { getServiceSupabase } from '@/app/lib/server/adminAuth';
import { privateNoStoreJson, withPrivateNoStore } from '@/app/lib/server/privateNoStore';
import { requireSpokeduMasterCapability } from '@/app/lib/server/spokeduMasterAccess';
import { isStage2WriteGateError, stage2WriteGateResponse } from '@/app/lib/server/spokeduMasterStage2WriteGate';
import { LOCKED_ROSTER_MESSAGE } from '@/app/spokedu-master/lib/sessionIntegrity';

export async function PUT(request: Request, context: { params: Promise<{ sessionId: string }> }) {
  const access = await requireSpokeduMasterCapability('attendance');
  if (!access.ok) return withPrivateNoStore(access.response);
  const { sessionId } = await context.params;
  const body = await request.json().catch(() => null);
  if (!body || !Array.isArray(body.changes) || !Number.isInteger(body.expectedVersion) || body.expectedVersion < 1) return privateNoStoreJson({ error: 'Invalid attendance' }, { status: 400 });
  const changes = body.changes.map((item: unknown) => {
    const value = item as Record<string, unknown>;
    return { studentId: value.studentId, status: value.status };
  });
  if (changes.some((item: { studentId: unknown; status: unknown }) => typeof item.studentId !== 'string' || (item.status !== null && item.status !== 'pending' && item.status !== 'present' && item.status !== 'absent'))) {
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
  if (!session.roster_locked_at && changes.some((item: { status: unknown }) => item.status === 'pending')) {
    return privateNoStoreJson({ error: 'Invalid attendance' }, { status: 400 });
  }
  if (session.roster_locked_at) {
    const lockedIds = ((session.spokedu_master_session_attendance ?? []) as Array<{ student_id: string }>).map((item) => item.student_id);
    const submittedIds = changes.map((item: { studentId: unknown }) => String(item.studentId));
    if (changes.some((item: { status: unknown }) => item.status === null) || submittedIds.some((id: string) => !lockedIds.includes(id))) {
      return privateNoStoreJson({ error: LOCKED_ROSTER_MESSAGE }, { status: 400 });
    }
  }
  const { data: attendanceVersion, error } = await supabase.rpc('spokedu_master_update_session_attendance_v2', {
    p_owner_id: access.userId, p_session_id: sessionId, p_expected_version: body.expectedVersion, p_changes: changes,
  });
  if (error) {
    if (isStage2WriteGateError(error)) return stage2WriteGateResponse();
    const message = String(error.message ?? '');
    const locked = error.code === '22023' && message.includes('locked roster');
    if (error.code === '40001') return privateNoStoreJson({ error: 'Attendance changed elsewhere' }, { status: 409 });
    return privateNoStoreJson({
      error: locked ? LOCKED_ROSTER_MESSAGE : error.code === '22023' ? 'Attendance cannot be changed' : 'Attendance could not be saved',
    }, { status: error.code === '22023' ? 400 : 500 });
  }
  return privateNoStoreJson({ ok: true, attendanceVersion });
}
