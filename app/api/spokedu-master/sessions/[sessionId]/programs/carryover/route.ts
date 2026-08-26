import { getServiceSupabase } from '@/app/lib/server/adminAuth';
import { privateNoStoreJson, withPrivateNoStore } from '@/app/lib/server/privateNoStore';
import { requireSpokeduMasterCapability } from '@/app/lib/server/spokeduMasterAccess';
import { findOfficialSpomovePreset } from '@/app/spokedu-master/spomove/officialSpomovePresets';

export async function POST(request: Request, context: { params: Promise<{ sessionId: string }> }) {
  const access = await requireSpokeduMasterCapability('attendance');
  if (!access.ok) return withPrivateNoStore(access.response);
  const { sessionId: targetSessionId } = await context.params;
  const body = await request.json().catch(() => null) as { sourceSessionId?: unknown; sourceSessionProgramIds?: unknown } | null;
  const sourceSessionId = typeof body?.sourceSessionId === 'string' ? body.sourceSessionId : '';
  const ids = body?.sourceSessionProgramIds;
  if (!sourceSessionId || !Array.isArray(ids) || ids.some((id) => typeof id !== 'string') || new Set(ids).size !== ids.length) return privateNoStoreJson({ error: '가져올 활동을 확인해 주세요.' }, { status: 400 });
  const supabase = getServiceSupabase();
  const { data: rows, error: rowError } = await supabase.from('spokedu_master_session_programs').select('id,source_type,program_id,spomove_preset_id').eq('owner_id', access.userId).eq('session_id', sourceSessionId).in('id', ids);
  if (rowError || (rows ?? []).length !== ids.length) return privateNoStoreJson({ error: '선택한 활동이 이전 수업과 일치하지 않습니다.' }, { status: 400 });
  const spomove = (rows ?? []).filter((row) => row.source_type === 'spomove');
  if (spomove.some((row) => { const preset = findOfficialSpomovePreset(row.spomove_preset_id ?? ''); return !preset?.isReady || preset.catalogStatus === 'hold'; }) || (spomove.length && access.plan === 'lite')) return privateNoStoreJson({ error: '현재 이용할 수 없는 SPOMOVE 활동이 포함되어 있습니다.' }, { status: 403 });
  const programIds = (rows ?? []).filter((row) => row.source_type === 'program').map((row) => Number(row.program_id));
  if (programIds.length) {
    const { data: published } = await supabase.from('spokedu_pro_programs').select('source_center_curriculum_id').in('source_center_curriculum_id', programIds).eq('is_published', true);
    if (new Set((published ?? []).map((row) => Number(row.source_center_curriculum_id))).size !== new Set(programIds).size) return privateNoStoreJson({ error: '현재 이용할 수 없는 놀이체육 활동이 포함되어 있습니다.' }, { status: 400 });
    if (access.plan === 'lite') { const { data: proRows } = await supabase.from('spokedu_master_program_meta').select('curriculum_id').in('curriculum_id', programIds).eq('sm_is_pro', true); if ((proRows ?? []).length) return privateNoStoreJson({ error: '현재 이용권으로 가져올 수 없는 활동이 포함되어 있습니다.' }, { status: 403 }); }
  }
  const { error } = await supabase.rpc('spokedu_master_carryover_session_programs', { p_owner_id: access.userId, p_source_session_id: sourceSessionId, p_target_session_id: targetSessionId, p_source_session_program_ids: ids });
  if (error) return privateNoStoreJson({ error: error.code === '22023' ? '이전 수업과 대상 수업을 확인해 주세요.' : '선택한 활동을 가져오지 못했습니다.' }, { status: error.code === '22023' ? 400 : 500 });
  const { data } = await supabase.from('spokedu_master_session_programs').select('id,source_type,program_id,spomove_preset_id,program_title_snapshot,sort_order,is_completed').eq('owner_id', access.userId).eq('session_id', targetSessionId).order('sort_order');
  return privateNoStoreJson({ data: (data ?? []).map((item) => ({ id: item.id, sourceType: item.source_type, programId: item.program_id == null ? null : Number(item.program_id), spomovePresetId: item.spomove_preset_id, programTitle: item.program_title_snapshot, sortOrder: item.sort_order, isCompleted: item.is_completed })) });
}
