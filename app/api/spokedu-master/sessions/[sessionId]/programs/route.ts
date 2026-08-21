import { getServiceSupabase } from '@/app/lib/server/adminAuth';
import { privateNoStoreJson, withPrivateNoStore } from '@/app/lib/server/privateNoStore';
import { requireSpokeduMasterAccess } from '@/app/lib/server/spokeduMasterAccess';

export async function POST(request: Request, context: { params: Promise<{ sessionId: string }> }) {
  const access = await requireSpokeduMasterAccess();
  if (!access.ok) return withPrivateNoStore(access.response);
  const { sessionId } = await context.params;
  const body = await request.json().catch(() => null) as { programId?: unknown; programTitle?: unknown } | null;
  const programId = Number(body?.programId);
  if (!Number.isInteger(programId) || programId < 1 || typeof body?.programTitle !== 'string') return privateNoStoreJson({ error: 'Invalid program' }, { status: 400 });
  const supabase = getServiceSupabase();
  const { data: id, error } = await supabase.rpc('spokedu_master_add_session_program', {
    p_owner_id: access.userId, p_session_id: sessionId, p_program_id: programId, p_program_title: body.programTitle,
  });
  if (error) return privateNoStoreJson({ error: error.code === '22023' || error.code === '23505' ? 'Program cannot be assigned to this class' : 'Program could not be assigned' }, { status: error.code === '22023' || error.code === '23505' ? 400 : 500 });
  const { data } = await supabase.from('spokedu_master_session_programs').select('id,program_id,program_title_snapshot,sort_order,is_completed').eq('id', id).eq('owner_id', access.userId).single();
  return privateNoStoreJson({ data: { id: data!.id, programId: Number(data!.program_id), programTitle: data!.program_title_snapshot, sortOrder: data!.sort_order, isCompleted: data!.is_completed } }, { status: 201 });
}
