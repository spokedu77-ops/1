import { getServiceSupabase } from '@/app/lib/server/adminAuth';
import { reportError } from '@/app/lib/monitoring/errorReporter';
import { privateNoStoreJson, withPrivateNoStore } from '@/app/lib/server/privateNoStore';
import { requireSpokeduMasterAccess } from '@/app/lib/server/spokeduMasterAccess';
import {
  normalizeStudentInput,
  toStudentDto,
  type MasterStudentRow,
} from '@/app/api/spokedu-master/operational-data';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const STUDENT_SELECT = 'id,owner_id,legacy_id,name,group_name,meta,guidance_note,created_at,updated_at,deleted_at';
const STUDENT_SERVER_ERROR = '학생 정보를 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.';

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const access = await requireSpokeduMasterAccess();
  if (!access.ok) return withPrivateNoStore(access.response);

  const { id } = await context.params;
  if (!id) {
    return privateNoStoreJson({ error: 'student id is required' }, { status: 400 });
  }

  let input;
  try {
    const body = await request.json();
    if (!body || typeof body !== 'object' || !Array.isArray((body as { classIds?: unknown }).classIds)) {
      throw new Error('classIds is required');
    }
    input = normalizeStudentInput(body);
  } catch (error) {
    return privateNoStoreJson(
      { error: error instanceof Error ? error.message : 'Invalid student payload' },
      { status: 400 },
    );
  }

  const supabase = getServiceSupabase();
  const { data: existing, error: existingError } = await supabase
    .from('spokedu_master_students')
    .select(STUDENT_SELECT)
    .eq('owner_id', access.userId)
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle();

  if (existingError) {
    await reportError(existingError, {
      context: 'spokedu_master.operational.students',
      tags: { method: 'PATCH', stage: 'lookup', status: 500 },
    });
    return privateNoStoreJson({ error: STUDENT_SERVER_ERROR }, { status: 500 });
  }
  if (!existing) {
    return privateNoStoreJson({ error: 'student not found' }, { status: 404 });
  }

  const { data: savedId, error } = await supabase.rpc('spokedu_master_save_student', {
    p_owner_id: access.userId,
    p_student_id: id,
    p_legacy_id: existing.legacy_id,
    p_name: input.name,
    p_meta: input.meta,
    p_guidance_note: input.guidanceNote ?? existing.guidance_note ?? null,
    p_class_ids: input.classIds,
  });

  if (error) {
    await reportError(error, {
      context: 'spokedu_master.operational.students',
      tags: { method: 'PATCH', stage: 'update', status: 500 },
    });
    if (error.code === '22023') return privateNoStoreJson({ error: '학생 정보 또는 수업반을 확인해 주세요.' }, { status: 400 });
    if (error.code === 'P0002') return privateNoStoreJson({ error: 'student not found' }, { status: 404 });
    return privateNoStoreJson({ error: STUDENT_SERVER_ERROR }, { status: 500 });
  }

  const { data, error: reloadError } = await supabase.from('spokedu_master_students')
    .select(STUDENT_SELECT).eq('id', savedId).eq('owner_id', access.userId).single();
  if (reloadError) return privateNoStoreJson({ error: STUDENT_SERVER_ERROR }, { status: 500 });
  return privateNoStoreJson({ data: toStudentDto(data as MasterStudentRow), classIds: input.classIds });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const access = await requireSpokeduMasterAccess();
  if (!access.ok) return withPrivateNoStore(access.response);

  const { id } = await context.params;
  if (!id) {
    return privateNoStoreJson({ error: 'student id is required' }, { status: 400 });
  }

  const supabase = getServiceSupabase();
  const { data: existing, error: existingError } = await supabase
    .from('spokedu_master_students')
    .select('id')
    .eq('owner_id', access.userId)
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle();

  if (existingError) {
    await reportError(existingError, {
      context: 'spokedu_master.operational.students',
      tags: { method: 'DELETE', stage: 'lookup', status: 500 },
    });
    return privateNoStoreJson({ error: STUDENT_SERVER_ERROR }, { status: 500 });
  }
  if (!existing) {
    return privateNoStoreJson({ error: 'student not found' }, { status: 404 });
  }

  const { error } = await supabase.rpc('spokedu_master_soft_delete_student', {
    p_owner_id: access.userId, p_student_id: id,
  });

  if (error) {
    await reportError(error, {
      context: 'spokedu_master.operational.students',
      tags: { method: 'DELETE', stage: 'soft_delete', status: 500 },
    });
    return privateNoStoreJson({ error: STUDENT_SERVER_ERROR }, { status: 500 });
  }

  return privateNoStoreJson({ ok: true });
}
