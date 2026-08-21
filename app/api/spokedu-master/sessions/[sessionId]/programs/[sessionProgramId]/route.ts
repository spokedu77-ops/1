import { getServiceSupabase } from '@/app/lib/server/adminAuth';
import { privateNoStoreJson, withPrivateNoStore } from '@/app/lib/server/privateNoStore';
import { requireSpokeduMasterAccess } from '@/app/lib/server/spokeduMasterAccess';

async function status(ownerId: string, sessionId: string) {
  return getServiceSupabase().from('spokedu_master_sessions').select('status').eq('id', sessionId).eq('owner_id', ownerId).is('deleted_at', null).maybeSingle();
}
export async function PATCH(request: Request, context: { params: Promise<{ sessionId: string; sessionProgramId: string }> }) {
  const access = await requireSpokeduMasterAccess(); if (!access.ok) return withPrivateNoStore(access.response);
  const { sessionId, sessionProgramId } = await context.params;
  const body = await request.json().catch(() => null) as { isCompleted?: unknown } | null;
  if (typeof body?.isCompleted !== 'boolean') return privateNoStoreJson({ error: 'Invalid program status' }, { status: 400 });
  const current = await status(access.userId, sessionId);
  if (!current.data || current.data.status === 'cancelled') return privateNoStoreJson({ error: 'Cancelled classes cannot be changed' }, { status: 400 });
  const { error } = await getServiceSupabase().from('spokedu_master_session_programs').update({ is_completed: body.isCompleted }).eq('id', sessionProgramId).eq('session_id', sessionId).eq('owner_id', access.userId);
  if (error) return privateNoStoreJson({ error: 'Program status could not be saved' }, { status: 500 });
  return privateNoStoreJson({ ok: true });
}
export async function DELETE(_request: Request, context: { params: Promise<{ sessionId: string; sessionProgramId: string }> }) {
  const access = await requireSpokeduMasterAccess(); if (!access.ok) return withPrivateNoStore(access.response);
  const { sessionId, sessionProgramId } = await context.params;
  const current = await status(access.userId, sessionId);
  if (!current.data || current.data.status !== 'scheduled') return privateNoStoreJson({ error: 'Programs can only be removed from scheduled classes' }, { status: 400 });
  const { error } = await getServiceSupabase().from('spokedu_master_session_programs').delete().eq('id', sessionProgramId).eq('session_id', sessionId).eq('owner_id', access.userId);
  if (error) return privateNoStoreJson({ error: 'Program could not be removed' }, { status: 500 });
  return privateNoStoreJson({ ok: true });
}
