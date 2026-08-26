import { getServiceSupabase } from '@/app/lib/server/adminAuth';
import { privateNoStoreJson, withPrivateNoStore } from '@/app/lib/server/privateNoStore';
import { requireSpokeduMasterCapability } from '@/app/lib/server/spokeduMasterAccess';
import { toClassRecordDto, type MasterClassRecordRow } from '../operational-data';

const CHILD_SELECT = `id,owner_id,record_id,student_id,student_legacy_id,student_name_snapshot,attendance,focused,skills,memo,observation_score,created_at,updated_at`;
const parentSelect = (studentFilter: boolean) => `id,session_id,legacy_id,class_date,lesson_title,class_id,program_id,program_title,record_type,memo,application_idea,parent_note_snapshot,created_at,updated_at,deleted_at,spokedu_master_class_record_students${studentFilter ? '!inner' : ''}(${CHILD_SELECT})`;
const SELECT = parentSelect(false);

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const access = await requireSpokeduMasterCapability('records');
  if (!access.ok) return withPrivateNoStore(access.response);
  const params = new URL(request.url).searchParams;
  const sessionId = params.get('session')?.trim();
  const classId = params.get('class')?.trim();
  const studentId = params.get('student')?.trim();
  const requestedLimit = Number(params.get('limit'));
  let query = getServiceSupabase().from('spokedu_master_class_records').select(parentSelect(Boolean(studentId)))
    .eq('owner_id', access.userId).not('session_id', 'is', null).is('deleted_at', null)
    .order('class_date', { ascending: false }).order('created_at', { ascending: false });
  if (sessionId) query = query.eq('session_id', sessionId);
  if (classId) query = query.eq('class_id', classId);
  if (studentId) query = query.eq('spokedu_master_class_record_students.student_id', studentId);
  if (!studentId) query = query.limit(sessionId ? 1 : Number.isInteger(requestedLimit) && requestedLimit > 0 ? Math.min(requestedLimit, 100) : 20);
  const { data, error } = await query;
  if (error) return privateNoStoreJson({ error: '수업 기록을 불러오지 못했습니다.' }, { status: 500 });
  const captures = ((data ?? []) as unknown as MasterClassRecordRow[]).map(toClassRecordDto);
  return privateNoStoreJson({ data: captures });
}

export async function POST(request: Request) {
  const access = await requireSpokeduMasterCapability('records');
  if (!access.ok) return withPrivateNoStore(access.response);
  const body = await request.json().catch(() => null) as { sessionId?: unknown; nextSessionNote?: unknown; observations?: unknown } | null;
  const sessionId = typeof body?.sessionId === 'string' ? body.sessionId.trim() : '';
  const nextSessionNote = typeof body?.nextSessionNote === 'string' ? body.nextSessionNote.trim() : '';
  const observations = Array.isArray(body?.observations) ? body.observations : [];
  if (!sessionId || observations.some((item) => !item || typeof item !== 'object' || typeof (item as { studentId?: unknown }).studentId !== 'string' || typeof (item as { memo?: unknown }).memo !== 'string')) {
    return privateNoStoreJson({ error: 'Invalid Session Capture payload' }, { status: 400 });
  }
  const students = observations.map((item) => ({ student_id: (item as { studentId: string }).studentId.trim(), memo: (item as { memo: string }).memo.trim() }));
  const supabase = getServiceSupabase();
  const { data: recordId, error } = await supabase.rpc('spokedu_master_save_session_capture', {
    p_owner_id: access.userId, p_session_id: sessionId, p_next_session_note: nextSessionNote, p_students: students,
  });
  if (error) {
    const status = error.code === 'P0002' ? 404 : error.code === '22023' ? 400 : 500;
    return privateNoStoreJson({ error: status === 404 ? 'Session not found' : status === 400 ? error.message : '수업 기록을 저장하지 못했습니다.' }, { status });
  }
  const { data, error: reloadError } = await supabase.from('spokedu_master_class_records').select(SELECT)
    .eq('owner_id', access.userId).eq('id', recordId).single();
  if (reloadError || !data) return privateNoStoreJson({ error: '수업 기록을 다시 불러오지 못했습니다.' }, { status: 500 });
  return privateNoStoreJson({ data: toClassRecordDto(data as unknown as MasterClassRecordRow) });
}
