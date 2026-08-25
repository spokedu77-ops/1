import { getServiceSupabase } from '@/app/lib/server/adminAuth';
import { privateNoStoreJson, withPrivateNoStore } from '@/app/lib/server/privateNoStore';
import { requireSpokeduMasterCapability } from '@/app/lib/server/spokeduMasterAccess';

async function status(ownerId: string, sessionId: string) {
  return getServiceSupabase().from('spokedu_master_sessions').select('status').eq('id', sessionId).eq('owner_id', ownerId).is('deleted_at', null).maybeSingle();
}
export async function PATCH(request: Request, context: { params: Promise<{ sessionId: string; sessionProgramId: string }> }) {
  const access = await requireSpokeduMasterCapability('attendance'); if (!access.ok) return withPrivateNoStore(access.response);
  const { sessionId, sessionProgramId } = await context.params;
  const body = await request.json().catch(() => null) as { isCompleted?: unknown } | null;
  if (typeof body?.isCompleted !== 'boolean') return privateNoStoreJson({ error: 'Invalid program status' }, { status: 400 });
  const { error } = await getServiceSupabase().rpc('spokedu_master_update_session_program_completion', {
    p_owner_id: access.userId, p_session_id: sessionId,
    p_session_program_id: sessionProgramId, p_is_completed: body.isCompleted,
  });
  if (error) return privateNoStoreJson({ error: error.code === '22023' ? 'Activity progress cannot be changed' : 'Program status could not be saved' }, { status: error.code === '22023' ? 400 : 500 });
  return privateNoStoreJson({ ok: true });
}
export async function DELETE(_request: Request, context: { params: Promise<{ sessionId: string; sessionProgramId: string }> }) {
  const access = await requireSpokeduMasterCapability('attendance'); if (!access.ok) return withPrivateNoStore(access.response);
  const { sessionId, sessionProgramId } = await context.params;
  const current = await status(access.userId, sessionId);
  if (!current.data || current.data.status !== 'scheduled') return privateNoStoreJson({ error: 'Programs can only be removed from scheduled classes' }, { status: 400 });
  const { error } = await getServiceSupabase().rpc('spokedu_master_remove_session_program', { p_owner_id: access.userId, p_session_id: sessionId, p_program_id: sessionProgramId });
  if (error) return privateNoStoreJson({ error: 'Program could not be removed' }, { status: 500 });
  return privateNoStoreJson({ ok: true });
}
