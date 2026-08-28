import { getServiceSupabase } from '@/app/lib/server/adminAuth';
import { privateNoStoreJson, withPrivateNoStore } from '@/app/lib/server/privateNoStore';
import { requireSpokeduMasterCapability } from '@/app/lib/server/spokeduMasterAccess';
import { reportError } from '@/app/lib/monitoring/errorReporter';
import type {
  MasterClassDto,
  MasterSessionDto,
  MasterSessionStatus,
  SaveSessionInput,
} from '@/app/spokedu-master/types/operational';
import { findOfficialSpomovePreset } from '@/app/spokedu-master/spomove/officialSpomovePresets';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const SESSION_SELECT = `
  id, class_id, class_name_snapshot, start_at, started_at, end_at, status, memo, completed_at, schedule_rule_id, created_at, updated_at,
  spokedu_master_session_programs(id, source_type, program_id, spomove_preset_id, program_title_snapshot, sort_order, is_completed),
  spokedu_master_session_attendance(id, student_id, student_name_snapshot, status)
`;

type SessionRow = {
  id: string;
  class_id: string;
  class_name_snapshot: string;
  start_at: string;
  started_at: string | null;
  end_at: string;
  status: MasterSessionStatus;
  memo: string | null;
  completed_at: string | null;
  schedule_rule_id: string | null;
  created_at: string;
  updated_at: string;
  spokedu_master_session_programs: Array<{
    id: string; source_type: 'program' | 'spomove'; program_id: number | string | null;
    spomove_preset_id: string | null; program_title_snapshot: string | null;
    sort_order: number; is_completed: boolean;
  }>;
  spokedu_master_session_attendance: Array<{
    id: string; student_id: string; student_name_snapshot: string; status: 'present' | 'absent';
  }>;
};

function toSessionDto(row: SessionRow): MasterSessionDto {
  return {
    id: row.id,
    classId: row.class_id,
    className: row.class_name_snapshot,
    startAt: row.start_at,
    startedAt: row.started_at,
    endAt: row.end_at,
    status: row.status,
    memo: row.memo,
    completedAt: row.completed_at,
    scheduleRuleId: row.schedule_rule_id,
    programs: [...(row.spokedu_master_session_programs ?? [])]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((item) => ({
        id: item.id,
        sourceType: item.source_type,
        programId: item.program_id == null ? null : Number(item.program_id),
        spomovePresetId: item.spomove_preset_id,
        programTitle: item.program_title_snapshot,
        sortOrder: item.sort_order,
        isCompleted: item.is_completed,
      })),
    attendance: (row.spokedu_master_session_attendance ?? []).map((item) => ({
      id: item.id, studentId: item.student_id, studentName: item.student_name_snapshot, status: item.status,
    })),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function normalizeInput(value: unknown): SaveSessionInput {
  if (!isObject(value)) throw new Error('Invalid session payload');
  const classId = typeof value.classId === 'string' ? value.classId.trim() : '';
  const startAt = typeof value.startAt === 'string' ? new Date(value.startAt) : new Date(NaN);
  const endAt = typeof value.endAt === 'string' ? new Date(value.endAt) : new Date(NaN);
  const status = value.status;
  if (!classId || Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime()) || endAt <= startAt) {
    throw new Error('Class and valid start/end times are required');
  }
  if (status !== 'scheduled' && status !== 'completed' && status !== 'cancelled') {
    throw new Error('Invalid session status');
  }
  return {
    classId,
    startAt: startAt.toISOString(),
    endAt: endAt.toISOString(),
    status,
    memo: typeof value.memo === 'string' && value.memo.trim() ? value.memo.trim() : null,
    programs: Array.isArray(value.programs) ? value.programs.map((item) => {
      if (!isObject(item) || (item.sourceType !== 'program' && item.sourceType !== 'spomove')) throw new Error('Invalid activity');
      if (item.sourceType === 'program') {
        const programId = Number(item.programId);
        if (!Number.isInteger(programId) || programId < 1) throw new Error('Invalid program');
        return { sourceType: 'program' as const, programId, spomovePresetId: null };
      }
      const spomovePresetId = typeof item.spomovePresetId === 'string' ? item.spomovePresetId.trim() : '';
      if (!spomovePresetId) throw new Error('Invalid SPOMOVE activity');
      return { sourceType: 'spomove' as const, programId: null, spomovePresetId };
    }) : [],
  };
}

async function loadAggregate(ownerId: string, sessionId?: string) {
  const supabase = getServiceSupabase();
  let query = supabase.from('spokedu_master_sessions').select(SESSION_SELECT)
    .eq('owner_id', ownerId).is('deleted_at', null).order('start_at', { ascending: true });
  if (sessionId) query = query.eq('id', sessionId);
  const { data, error } = await query;
  if (error) throw error;
  return ((data ?? []) as unknown as SessionRow[]).map(toSessionDto);
}

export async function GET() {
  const access = await requireSpokeduMasterCapability('attendance');
  if (!access.ok) return withPrivateNoStore(access.response);
  const supabase = getServiceSupabase();
  const [{ data: classes, error: classError }, sessionsResult] = await Promise.all([
    supabase.from('spokedu_master_classes').select('id,name,created_at,updated_at,spokedu_master_class_students(student_id)')
      .eq('owner_id', access.userId).is('deleted_at', null).order('name'),
    loadAggregate(access.userId),
  ]);
  if (classError) return privateNoStoreJson({ error: 'Classes could not be loaded' }, { status: 500 });
  const classDtos: MasterClassDto[] = (classes ?? []).map((item) => ({
    id: item.id, name: item.name,
    studentIds: (item.spokedu_master_class_students ?? []).map((membership: { student_id: string }) => membership.student_id),
    createdAt: item.created_at, updatedAt: item.updated_at,
  }));
  return privateNoStoreJson({
    data: {
      classes: classDtos,
      sessions: sessionsResult.map((session) => access.plan === 'lite' ? { ...session, memo: null } : session),
    },
  });
}

async function save(request: Request, sessionId: string | null) {
  const access = await requireSpokeduMasterCapability('attendance');
  if (!access.ok) return withPrivateNoStore(access.response);
  let input: SaveSessionInput;
  try { input = normalizeInput(await request.json()); }
  catch (error) { return privateNoStoreJson({ error: error instanceof Error ? error.message : 'Invalid session' }, { status: 400 }); }
  if (access.plan === 'lite' && input.memo) {
    return privateNoStoreJson({ error: '수업 메모와 누적 기록은 Premium에서 사용할 수 있습니다.' }, { status: 403 });
  }
  const supabase = getServiceSupabase();
  let result: { data: unknown; error: { code?: string } | null };
  try {
    const canonicalActivities = (input.programs ?? []).map((item) => {
      if (item.sourceType === 'program') return item;
      const preset = findOfficialSpomovePreset(item.spomovePresetId ?? '');
      if (!preset?.isReady || preset.catalogStatus === 'hold') throw new Error('Invalid SPOMOVE activity');
      return { ...item, programTitle: preset.title };
    });
    result = sessionId
      ? await supabase.rpc('spokedu_master_save_session', {
          p_owner_id: access.userId, p_session_id: sessionId, p_class_id: input.classId,
          p_start_at: input.startAt, p_end_at: input.endAt, p_status: input.status,
          p_memo: input.memo, p_programs: [], p_attendance: [],
        })
      : await supabase.rpc('spokedu_master_create_session_with_activities', {
          p_owner_id: access.userId, p_class_id: input.classId, p_start_at: input.startAt,
          p_end_at: input.endAt, p_memo: input.memo, p_activities: canonicalActivities,
        });
  } catch {
    return privateNoStoreJson({ error: 'Invalid session activity' }, { status: 400 });
  }
  const { data: savedId, error } = result;
  if (error || typeof savedId !== 'string') {
    if (error?.code === '22023' || error?.code === '23505') return privateNoStoreJson({ error: 'Invalid session data' }, { status: 400 });
    if (error?.code === 'P0002') return privateNoStoreJson({ error: 'Session not found' }, { status: 404 });
    await reportError(error ?? new Error('Session RPC returned no id'), { context: 'spokedu_master.sessions' });
    return privateNoStoreJson({ error: 'Session could not be saved' }, { status: 500 });
  }
  const [aggregate] = await loadAggregate(access.userId, savedId);
  return privateNoStoreJson({ data: access.plan === 'lite' ? { ...aggregate, memo: null } : aggregate }, { status: sessionId ? 200 : 201 });
}

export async function POST(request: Request) { return save(request, null); }
export async function PATCH(request: Request) {
  const id = new URL(request.url).searchParams.get('id')?.trim() ?? null;
  if (!id) return privateNoStoreJson({ error: 'Session id is required' }, { status: 400 });
  return save(request, id);
}

export async function PUT(request: Request) {
  const access = await requireSpokeduMasterCapability('attendance');
  if (!access.ok) return access.response;
  const body = await request.json().catch(() => null) as {
    id?: unknown;
    session?: unknown;
    attendance?: unknown;
  } | null;
  if (typeof body?.id !== 'string' || !Array.isArray(body.attendance)) {
    return privateNoStoreJson({ error: 'Invalid completion data' }, { status: 400 });
  }
  let input: ReturnType<typeof normalizeInput>;
  try {
    input = normalizeInput(body.session);
  } catch {
    return privateNoStoreJson({ error: 'Invalid completion data' }, { status: 400 });
  }
  if (access.plan === 'lite' && input.memo) {
    return privateNoStoreJson({ error: '수업 메모와 누적 기록은 Premium에서 사용할 수 있습니다.' }, { status: 403 });
  }
  if (input.status !== 'completed' || body.attendance.some((item: unknown) => {
    if (!isObject(item)) return true;
    return typeof item.studentId !== 'string' || (item.status !== 'present' && item.status !== 'absent');
  })) {
    return privateNoStoreJson({ error: 'Invalid completion data' }, { status: 400 });
  }

  const supabase = getServiceSupabase();
  const { data: savedId, error } = await supabase.rpc('spokedu_master_complete_session', {
    p_owner_id: access.userId,
    p_session_id: body.id,
    p_class_id: input.classId,
    p_start_at: input.startAt,
    p_end_at: input.endAt,
    p_memo: input.memo,
    p_attendance: body.attendance,
  });
  if (error || !savedId) {
    if (error?.code === '22023') return privateNoStoreJson({ error: '수업 완료 정보를 확인해 주세요.' }, { status: 400 });
    if (error?.code === 'P0002') return privateNoStoreJson({ error: 'Session not found' }, { status: 404 });
    await reportError(error ?? new Error('Session completion RPC returned no id'), { context: 'spokedu_master.sessions.complete' });
    return privateNoStoreJson({ error: '수업을 완료하지 못했습니다.' }, { status: 500 });
  }
  const result = await loadAggregate(access.userId, savedId);
  if (!result[0]) return privateNoStoreJson({ error: '완료된 수업을 불러오지 못했습니다.' }, { status: 500 });
  return privateNoStoreJson({ data: access.plan === 'lite' ? { ...result[0], memo: null } : result[0] });
}

export async function DELETE(request: Request) {
  const access = await requireSpokeduMasterCapability('attendance');
  if (!access.ok) return withPrivateNoStore(access.response);
  const id = new URL(request.url).searchParams.get('id')?.trim();
  if (!id) return privateNoStoreJson({ error: 'Session id is required' }, { status: 400 });
  const { data, error } = await getServiceSupabase()
    .from('spokedu_master_sessions')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('owner_id', access.userId)
    .eq('status', 'cancelled')
    .is('deleted_at', null)
    .select('id')
    .maybeSingle();
  if (error) return privateNoStoreJson({ error: '수업을 삭제하지 못했습니다.' }, { status: 500 });
  if (!data) return privateNoStoreJson({ error: '삭제할 수 있는 취소 수업을 찾지 못했습니다.' }, { status: 404 });
  return privateNoStoreJson({ ok: true });
}
