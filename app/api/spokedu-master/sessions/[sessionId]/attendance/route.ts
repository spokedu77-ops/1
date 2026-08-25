import { getServiceSupabase } from '@/app/lib/server/adminAuth';
import { privateNoStoreJson, withPrivateNoStore } from '@/app/lib/server/privateNoStore';
import { requireSpokeduMasterCapability } from '@/app/lib/server/spokeduMasterAccess';

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
  const { error } = await getServiceSupabase().rpc('spokedu_master_replace_session_attendance', {
    p_owner_id: access.userId, p_session_id: sessionId, p_attendance: attendance,
  });
  if (error) return privateNoStoreJson({ error: error.code === '22023' ? 'Attendance cannot be changed' : 'Attendance could not be saved' }, { status: error.code === '22023' ? 400 : 500 });
  return privateNoStoreJson({ ok: true });
}
