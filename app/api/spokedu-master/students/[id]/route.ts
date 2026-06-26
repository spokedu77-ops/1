import { getServiceSupabase } from '@/app/lib/server/adminAuth';
import { reportError } from '@/app/lib/monitoring/errorReporter';
import { privateNoStoreJson, withPrivateNoStore } from '@/app/lib/server/privateNoStore';
import { requireSpokeduMasterAccess } from '@/app/lib/server/spokeduMasterAccess';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const STUDENT_SERVER_ERROR = '학생 정보를 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.';

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

  const { error } = await supabase
    .from('spokedu_master_students')
    .update({ deleted_at: new Date().toISOString() })
    .eq('owner_id', access.userId)
    .eq('id', id);

  if (error) {
    await reportError(error, {
      context: 'spokedu_master.operational.students',
      tags: { method: 'DELETE', stage: 'soft_delete', status: 500 },
    });
    return privateNoStoreJson({ error: STUDENT_SERVER_ERROR }, { status: 500 });
  }

  return privateNoStoreJson({ ok: true });
}
