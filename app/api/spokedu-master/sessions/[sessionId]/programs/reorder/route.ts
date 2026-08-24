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
  const { data, error: loadError } = await getServiceSupabase()
    .from('spokedu_master_session_programs')
    .select('id,source_type,program_id,spomove_preset_id,program_title_snapshot,sort_order,is_completed')
    .eq('owner_id', access.userId).eq('session_id', sessionId).order('sort_order');
  if (loadError) return privateNoStoreJson({ error: 'Program order could not be loaded' }, { status: 500 });
  return privateNoStoreJson({ data: (data ?? []).map((item) => ({
    id: item.id,
    sourceType: item.source_type,
    programId: item.program_id == null ? null : Number(item.program_id),
    spomovePresetId: item.spomove_preset_id,
    programTitle: item.program_title_snapshot,
    sortOrder: item.sort_order,
    isCompleted: item.is_completed,
  })) });
}
