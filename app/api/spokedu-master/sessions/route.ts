import { getServiceSupabase } from '@/app/lib/server/adminAuth';
import { privateNoStoreJson, withPrivateNoStore } from '@/app/lib/server/privateNoStore';
import { requireSpokeduMasterAccess } from '@/app/lib/server/spokeduMasterAccess';
import { reportError } from '@/app/lib/monitoring/errorReporter';
import type {
  MasterClassDto,
  MasterSessionDto,
  MasterSessionStatus,
  SaveSessionInput,
} from '@/app/spokedu-master/types/operational';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const SESSION_SELECT = `
  id, class_id, start_at, end_at, status, memo, completed_at, created_at, updated_at,
  spokedu_master_classes!inner(name),
  spokedu_master_session_programs(id, program_id, program_title_snapshot, sort_order, is_completed),
  spokedu_master_session_attendance(id, student_id, status)
`;

type SessionRow = {
  id: string;
  class_id: string;
  start_at: string;
  end_at: string;
  status: MasterSessionStatus;
  memo: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  spokedu_master_classes: { name: string } | Array<{ name: string }>;
  spokedu_master_session_programs: Array<{
    id: string; program_id: number | string; program_title_snapshot: string | null;
    sort_order: number; is_completed: boolean;
  }>;
  spokedu_master_session_attendance: Array<{
    id: string; student_id: string; status: 'present' | 'absent';
  }>;
};

function className(row: SessionRow) {
  return Array.isArray(row.spokedu_master_classes)
    ? row.spokedu_master_classes[0]?.name ?? ''
    : row.spokedu_master_classes.name;
}

function toSessionDto(row: SessionRow): MasterSessionDto {
  return {
    id: row.id,
    classId: row.class_id,
    className: className(row),
    startAt: row.start_at,
    endAt: row.end_at,
    status: row.status,
    memo: row.memo,
    completedAt: row.completed_at,
    programs: [...(row.spokedu_master_session_programs ?? [])]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((item) => ({
        id: item.id,
        programId: Number(item.program_id),
        programTitle: item.program_title_snapshot,
        sortOrder: item.sort_order,
        isCompleted: item.is_completed,
      })),
    attendance: (row.spokedu_master_session_attendance ?? []).map((item) => ({
      id: item.id, studentId: item.student_id, status: item.status,
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
  if (!Array.isArray(value.programs) || !Array.isArray(value.attendance)) {
    throw new Error('Programs and attendance must be arrays');
  }
  const programs = value.programs.map((item, index) => {
    if (!isObject(item)) throw new Error('Invalid program');
    const programId = Number(item.programId);
    if (!Number.isInteger(programId) || programId < 1) throw new Error('Invalid program');
    return {
      programId,
      programTitle: typeof item.programTitle === 'string' && item.programTitle.trim() ? item.programTitle.trim() : null,
      sortOrder: index,
      isCompleted: item.isCompleted === true,
    };
  });
  if (new Set(programs.map((item) => item.programId)).size !== programs.length) throw new Error('Duplicate program');
  const attendance = value.attendance.map((item) => {
    if (!isObject(item) || typeof item.studentId !== 'string' || (item.status !== 'present' && item.status !== 'absent')) {
      throw new Error('Invalid attendance');
    }
    return { studentId: item.studentId, status: item.status as 'present' | 'absent' };
  });
  if (new Set(attendance.map((item) => item.studentId)).size !== attendance.length) throw new Error('Duplicate attendance');
  return {
    classId,
    startAt: startAt.toISOString(),
    endAt: endAt.toISOString(),
    status,
    memo: typeof value.memo === 'string' && value.memo.trim() ? value.memo.trim() : null,
    programs,
    attendance,
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
  const access = await requireSpokeduMasterAccess();
  if (!access.ok) return withPrivateNoStore(access.response);
  const supabase = getServiceSupabase();
  const [{ data: classes, error: classError }, sessionsResult] = await Promise.all([
    supabase.from('spokedu_master_classes').select('id,name,created_at,updated_at')
      .eq('owner_id', access.userId).is('deleted_at', null).order('name'),
    loadAggregate(access.userId),
  ]);
  if (classError) return privateNoStoreJson({ error: 'Classes could not be loaded' }, { status: 500 });
  const classDtos: MasterClassDto[] = (classes ?? []).map((item) => ({
    id: item.id, name: item.name, createdAt: item.created_at, updatedAt: item.updated_at,
  }));
  return privateNoStoreJson({ data: { classes: classDtos, sessions: sessionsResult } });
}

async function save(request: Request, sessionId: string | null) {
  const access = await requireSpokeduMasterAccess();
  if (!access.ok) return withPrivateNoStore(access.response);
  let input: SaveSessionInput;
  try { input = normalizeInput(await request.json()); }
  catch (error) { return privateNoStoreJson({ error: error instanceof Error ? error.message : 'Invalid session' }, { status: 400 }); }
  const supabase = getServiceSupabase();
  const { data: savedId, error } = await supabase.rpc('spokedu_master_save_session', {
    p_owner_id: access.userId,
    p_session_id: sessionId,
    p_class_id: input.classId,
    p_start_at: input.startAt,
    p_end_at: input.endAt,
    p_status: input.status,
    p_memo: input.memo,
    p_programs: input.programs,
    p_attendance: input.attendance,
  });
  if (error || typeof savedId !== 'string') {
    if (error?.code === '22023' || error?.code === '23505') return privateNoStoreJson({ error: 'Invalid session data' }, { status: 400 });
    if (error?.code === 'P0002') return privateNoStoreJson({ error: 'Session not found' }, { status: 404 });
    await reportError(error ?? new Error('Session RPC returned no id'), { context: 'spokedu_master.sessions' });
    return privateNoStoreJson({ error: 'Session could not be saved' }, { status: 500 });
  }
  const [result] = await loadAggregate(access.userId, savedId);
  return privateNoStoreJson({ data: result }, { status: sessionId ? 200 : 201 });
}

export async function POST(request: Request) { return save(request, null); }
export async function PATCH(request: Request) {
  const id = new URL(request.url).searchParams.get('id')?.trim() ?? null;
  if (!id) return privateNoStoreJson({ error: 'Session id is required' }, { status: 400 });
  return save(request, id);
}
