import { getServiceSupabase } from '@/app/lib/server/adminAuth';
import { reportError } from '@/app/lib/monitoring/errorReporter';
import { privateNoStoreJson, withPrivateNoStore } from '@/app/lib/server/privateNoStore';
import { requireSpokeduMasterCapability } from '@/app/lib/server/spokeduMasterAccess';
import { findOfficialSpomovePreset } from '@/app/spokedu-master/spomove/officialSpomovePresets';
import type { MasterSessionDto, MasterSessionStatus } from '@/app/spokedu-master/types/operational';

const SESSION_SELECT = `id,class_id,class_name_snapshot,start_at,end_at,status,memo,completed_at,created_at,updated_at,
spokedu_master_session_programs(id,source_type,program_id,spomove_preset_id,program_title_snapshot,sort_order,is_completed),
spokedu_master_session_attendance(id,student_id,student_name_snapshot,status)`;

export async function POST(request: Request, context: { params: Promise<{ sessionId: string }> }) {
  const access = await requireSpokeduMasterCapability('attendance');
  if (!access.ok) return withPrivateNoStore(access.response);
  const { sessionId } = await context.params;
  const body = await request.json().catch(() => null) as { startAt?: unknown; endAt?: unknown; copyPrograms?: unknown; sourceSessionProgramIds?: unknown } | null;
  const startAt = typeof body?.startAt === 'string' ? new Date(body.startAt) : new Date(NaN);
  const endAt = typeof body?.endAt === 'string' ? new Date(body.endAt) : new Date(NaN);
  const ids = body?.sourceSessionProgramIds;
  const selective = Array.isArray(ids);
  if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime()) || endAt <= startAt
    || (!selective && typeof body?.copyPrograms !== 'boolean')
    || (selective && (ids.some((id) => typeof id !== 'string') || new Set(ids).size !== ids.length))) {
    return privateNoStoreJson({ error: '날짜, 시간, 활동 선택을 확인해 주세요.' }, { status: 400 });
  }

  const supabase = getServiceSupabase();
  if (selective) {
    const { data: rows, error: selectedError } = await supabase.from('spokedu_master_session_programs')
      .select('id,source_type,program_id,spomove_preset_id').eq('owner_id', access.userId).eq('session_id', sessionId).in('id', ids);
    if (selectedError || (rows ?? []).length !== ids.length) return privateNoStoreJson({ error: '선택한 활동이 원본 수업과 일치하지 않습니다.' }, { status: 400 });
    const spomove = (rows ?? []).filter((row) => row.source_type === 'spomove');
    if (spomove.some((row) => { const preset = findOfficialSpomovePreset(row.spomove_preset_id ?? ''); return !preset?.isReady || preset.catalogStatus === 'hold'; })
      || (spomove.length > 0 && access.plan === 'lite')) return privateNoStoreJson({ error: '현재 이용할 수 없는 SPOMOVE 활동이 포함되어 있습니다.' }, { status: 403 });
    const programIds = (rows ?? []).filter((row) => row.source_type === 'program').map((row) => Number(row.program_id));
    if (programIds.length) {
      const { data: published } = await supabase.from('spokedu_pro_programs').select('source_center_curriculum_id').in('source_center_curriculum_id', programIds).eq('is_published', true);
      if (new Set((published ?? []).map((row) => Number(row.source_center_curriculum_id))).size !== new Set(programIds).size) return privateNoStoreJson({ error: '현재 이용할 수 없는 놀이체육 활동이 포함되어 있습니다.' }, { status: 400 });
      if (access.plan === 'lite') {
        const { data: proRows } = await supabase.from('spokedu_master_program_meta').select('curriculum_id').in('curriculum_id', programIds).eq('sm_is_pro', true);
        if ((proRows ?? []).length) return privateNoStoreJson({ error: '현재 이용권으로 가져올 수 없는 활동이 포함되어 있습니다.' }, { status: 403 });
      }
    }
  }

  const { data: nextId, error } = selective
    ? await supabase.rpc('spokedu_master_create_next_session_v2', { p_owner_id: access.userId, p_source_session_id: sessionId, p_start_at: startAt.toISOString(), p_end_at: endAt.toISOString(), p_source_session_program_ids: ids })
    : await supabase.rpc('spokedu_master_create_next_session', { p_owner_id: access.userId, p_source_session_id: sessionId, p_start_at: startAt.toISOString(), p_end_at: endAt.toISOString(), p_copy_programs: body?.copyPrograms });
  if (error || typeof nextId !== 'string') {
    if (error?.code === '22023' || error?.code === '23505') return privateNoStoreJson({ error: error.code === '23505' ? '같은 시간의 수업이 이미 있습니다.' : '완료된 수업과 선택한 활동을 확인해 주세요.' }, { status: 400 });
    await reportError(error ?? new Error('Next Session RPC returned no id'), { context: 'spokedu_master.sessions.next' });
    return privateNoStoreJson({ error: '다음 수업을 만들지 못했습니다.' }, { status: 500 });
  }
  const { data, error: loadError } = await supabase.from('spokedu_master_sessions').select(SESSION_SELECT).eq('id', nextId).eq('owner_id', access.userId).single();
  if (loadError || !data) return privateNoStoreJson({ error: '만든 수업을 불러오지 못했습니다.' }, { status: 500 });
  const row = data as unknown as { id: string; class_id: string; class_name_snapshot: string; start_at: string; end_at: string; status: MasterSessionStatus; memo: string | null; completed_at: string | null; created_at: string; updated_at: string; spokedu_master_session_programs: Array<{ id: string; source_type: 'program' | 'spomove'; program_id: number | string | null; spomove_preset_id: string | null; program_title_snapshot: string | null; sort_order: number; is_completed: boolean }>; spokedu_master_session_attendance: Array<{ id: string; student_id: string; student_name_snapshot: string; status: 'present' | 'absent' }> };
  const result: MasterSessionDto = { id: row.id, classId: row.class_id, className: row.class_name_snapshot, startAt: row.start_at, endAt: row.end_at, status: row.status, memo: row.memo, completedAt: row.completed_at, createdAt: row.created_at, updatedAt: row.updated_at, programs: [...(row.spokedu_master_session_programs ?? [])].sort((a, b) => a.sort_order - b.sort_order).map((item) => ({ id: item.id, sourceType: item.source_type, programId: item.program_id == null ? null : Number(item.program_id), spomovePresetId: item.spomove_preset_id, programTitle: item.program_title_snapshot, sortOrder: item.sort_order, isCompleted: item.is_completed })), attendance: (row.spokedu_master_session_attendance ?? []).map((item) => ({ id: item.id, studentId: item.student_id, studentName: item.student_name_snapshot, status: item.status })) };
  return privateNoStoreJson({ data: result }, { status: 201 });
}
