import { getServiceSupabase } from '@/app/lib/server/adminAuth';
import { privateNoStoreJson, withPrivateNoStore } from '@/app/lib/server/privateNoStore';
import { requireSpokeduMasterAccess } from '@/app/lib/server/spokeduMasterAccess';

export async function DELETE(_request: Request, context: { params: Promise<{ classId: string; studentId: string }> }) {
  const access = await requireSpokeduMasterAccess();
  if (!access.ok) return withPrivateNoStore(access.response);
  const { classId, studentId } = await context.params;
  const { error } = await getServiceSupabase().from('spokedu_master_class_students').delete()
    .eq('owner_id', access.userId).eq('class_id', classId).eq('student_id', studentId);
  if (error) return privateNoStoreJson({ error: '수업반 등록 해제에 실패했습니다.' }, { status: 500 });
  return privateNoStoreJson({ ok: true });
}
