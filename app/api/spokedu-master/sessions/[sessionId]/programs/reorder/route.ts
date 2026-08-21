import { getServiceSupabase } from '@/app/lib/server/adminAuth';
import { privateNoStoreJson, withPrivateNoStore } from '@/app/lib/server/privateNoStore';
import { requireSpokeduMasterAccess } from '@/app/lib/server/spokeduMasterAccess';

export async function PATCH(request: Request, context: { params: Promise<{ sessionId: string }> }) {
  const access = await requireSpokeduMasterAccess(); if (!access.ok) return withPrivateNoStore(access.response);
  const { sessionId } = await context.params;
  const body = await request.json().catch(() => null) as { sessionProgramIds?: unknown } | null;
  if (!Array.isArray(body?.sessionProgramIds) || body.sessionProgramIds.some((id) => typeof id !== 'string')) return privateNoStoreJson({ error: 'Invalid program order' }, { status: 400 });
  const { error } = await getServiceSupabase().rpc('spokedu_master_reorder_session_programs', { p_owner_id: access.userId, p_session_id: sessionId, p_program_ids: body.sessionProgramIds });
  if (error) return privateNoStoreJson({ error: error.code === '22023' ? 'Program order cannot be changed' : 'Program order could not be saved' }, { status: error.code === '22023' ? 400 : 500 });
  return privateNoStoreJson({ ok: true });
}
