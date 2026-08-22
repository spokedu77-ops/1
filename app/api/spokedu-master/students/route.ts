import { getServiceSupabase } from '@/app/lib/server/adminAuth';
import { privateNoStoreJson, withPrivateNoStore } from '@/app/lib/server/privateNoStore';
import { requireSpokeduMasterAccess } from '@/app/lib/server/spokeduMasterAccess';
import { reportError } from '@/app/lib/monitoring/errorReporter';
import {
  normalizeStudentInput,
  toStudentDto,
  type MasterStudentRow,
} from '../operational-data';

const STUDENT_SELECT = 'id,owner_id,legacy_id,name,group_name,meta,guidance_note,created_at,updated_at,deleted_at';
const STUDENT_SERVER_ERROR = '학생 정보를 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const access = await requireSpokeduMasterAccess();
  if (!access.ok) return withPrivateNoStore(access.response);

  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from('spokedu_master_students')
    .select(STUDENT_SELECT)
    .eq('owner_id', access.userId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true })
    .order('name', { ascending: true });

  if (error) {
    await reportError(error, {
      context: 'spokedu_master.operational.students',
      tags: { method: 'GET', stage: 'select', status: 500 },
    });
    return privateNoStoreJson({ error: STUDENT_SERVER_ERROR }, { status: 500 });
  }

  return privateNoStoreJson({
    data: ((data ?? []) as MasterStudentRow[]).map(toStudentDto),
  });
}

export async function POST(request: Request) {
  const access = await requireSpokeduMasterAccess();
  if (!access.ok) return withPrivateNoStore(access.response);

  let input;
  try {
    input = normalizeStudentInput(await request.json());
  } catch (error) {
    return privateNoStoreJson(
      { error: error instanceof Error ? error.message : 'Invalid student payload' },
      { status: 400 },
    );
  }

  const supabase = getServiceSupabase();

  if (input.legacyId) {
    const { data: existing, error: existingError } = await supabase
      .from('spokedu_master_students')
      .select(STUDENT_SELECT)
      .eq('owner_id', access.userId)
      .eq('legacy_id', input.legacyId)
      .is('deleted_at', null)
      .maybeSingle();

    if (existingError) {
      await reportError(existingError, {
        context: 'spokedu_master.operational.students',
        tags: { method: 'POST', stage: 'dedupe_lookup', status: 500 },
      });
      return privateNoStoreJson({ error: STUDENT_SERVER_ERROR }, { status: 500 });
    }

    if (existing) {
      const { data: memberships, error: membershipError } = await supabase
        .from('spokedu_master_class_students').select('class_id')
        .eq('owner_id', access.userId).eq('student_id', existing.id);
      if (membershipError) return privateNoStoreJson({ error: STUDENT_SERVER_ERROR }, { status: 500 });
      return privateNoStoreJson({
        data: toStudentDto(existing as MasterStudentRow),
        classIds: (memberships ?? []).map((item: { class_id: string }) => item.class_id),
        duplicate: true,
      });
    }
  }

  const { data: savedId, error } = await supabase.rpc('spokedu_master_save_student', {
    p_owner_id: access.userId,
    p_student_id: null,
    p_legacy_id: input.legacyId,
    p_name: input.name,
    p_meta: input.meta,
    p_guidance_note: input.guidanceNote ?? null,
    p_class_ids: input.classIds,
  });

  if (error) {
    await reportError(error, {
      context: 'spokedu_master.operational.students',
      tags: { method: 'POST', stage: 'insert', status: 500 },
    });
    if (error.code === '22023' || error.code === '23505') return privateNoStoreJson({ error: '학생 정보 또는 수업반을 확인해 주세요.' }, { status: 400 });
    return privateNoStoreJson({ error: STUDENT_SERVER_ERROR }, { status: 500 });
  }

  const { data, error: reloadError } = await supabase.from('spokedu_master_students')
    .select(STUDENT_SELECT).eq('id', savedId).eq('owner_id', access.userId).single();
  if (reloadError) return privateNoStoreJson({ error: STUDENT_SERVER_ERROR }, { status: 500 });
  return privateNoStoreJson(
    { data: toStudentDto(data as MasterStudentRow), classIds: input.classIds, duplicate: false },
    { status: 201 },
  );
}
