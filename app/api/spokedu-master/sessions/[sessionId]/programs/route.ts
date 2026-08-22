import { getServiceSupabase } from '@/app/lib/server/adminAuth';
import { privateNoStoreJson, withPrivateNoStore } from '@/app/lib/server/privateNoStore';
import { requireSpokeduMasterAccess } from '@/app/lib/server/spokeduMasterAccess';
import { findOfficialSpomovePreset } from '@/app/spokedu-master/spomove/officialSpomovePresets';

export async function POST(request: Request, context: { params: Promise<{ sessionId: string }> }) {
  const access = await requireSpokeduMasterAccess();
  if (!access.ok) return withPrivateNoStore(access.response);
  const { sessionId } = await context.params;
  const body = await request.json().catch(() => null) as { sourceType?: unknown; programId?: unknown; spomovePresetId?: unknown; programTitle?: unknown } | null;
  const sourceType = body?.sourceType === 'spomove' ? 'spomove' : 'program';
  const supabase = getServiceSupabase();
  if (sourceType === 'spomove') {
    const presetId = typeof body?.spomovePresetId === 'string' ? body.spomovePresetId : '';
    const preset = findOfficialSpomovePreset(presetId);
    if (!preset?.isReady || preset.catalogStatus === 'hold') return privateNoStoreJson({ error: '선택할 수 없는 SPOMOVE 활동입니다.' }, { status: 400 });
    const { data: id, error } = await supabase.rpc('spokedu_master_add_session_spomove', {
      p_owner_id: access.userId, p_session_id: sessionId, p_preset_id: preset.id, p_title: preset.title,
    });
    if (error) return privateNoStoreJson({ error: error.code === '22023' || error.code === '23505' ? '이 수업에 SPOMOVE를 추가할 수 없습니다.' : 'SPOMOVE를 추가하지 못했습니다.' }, { status: error.code === '22023' || error.code === '23505' ? 400 : 500 });
    const { data } = await supabase.from('spokedu_master_session_programs').select('id,source_type,program_id,spomove_preset_id,program_title_snapshot,sort_order,is_completed').eq('id', id).eq('owner_id', access.userId).single();
    return privateNoStoreJson({ data: { id: data!.id, sourceType: 'spomove', programId: null, spomovePresetId: data!.spomove_preset_id, programTitle: data!.program_title_snapshot, sortOrder: data!.sort_order, isCompleted: data!.is_completed } }, { status: 201 });
  }
  const programId = Number(body?.programId);
  if (!Number.isInteger(programId) || programId < 1 || typeof body?.programTitle !== 'string') return privateNoStoreJson({ error: 'Invalid program' }, { status: 400 });
  const { data: id, error } = await supabase.rpc('spokedu_master_add_session_program', {
    p_owner_id: access.userId, p_session_id: sessionId, p_program_id: programId, p_program_title: body.programTitle,
  });
  if (error) return privateNoStoreJson({ error: error.code === '22023' || error.code === '23505' ? 'Program cannot be assigned to this class' : 'Program could not be assigned' }, { status: error.code === '22023' || error.code === '23505' ? 400 : 500 });
  const { data } = await supabase.from('spokedu_master_session_programs').select('id,source_type,program_id,spomove_preset_id,program_title_snapshot,sort_order,is_completed').eq('id', id).eq('owner_id', access.userId).single();
  return privateNoStoreJson({ data: { id: data!.id, sourceType: 'program', programId: Number(data!.program_id), spomovePresetId: null, programTitle: data!.program_title_snapshot, sortOrder: data!.sort_order, isCompleted: data!.is_completed } }, { status: 201 });
}
